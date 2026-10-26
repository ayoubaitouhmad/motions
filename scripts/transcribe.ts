// npm run transcribe <id> [--model medium] [--lang fr]
//
// For a voice you recorded yourself or made in the ElevenLabs website:
// put it in public/episodes/<id>/voice.mp3, then run this. It transcribes the
// audio locally with Whisper (free, offline after the first download) and saves
// word timestamps to timing.json. The script text is still what appears on
// screen; Whisper is only used for timing.
//
// First run downloads whisper.cpp and the model into .whisper/ (medium ≈ 1.5 GB).
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {downloadWhisperModel, installWhisperCpp, toCaptions, transcribe} from '@remotion/install-whisper-cpp';
import {narrationText} from '../src/lib/timeline';
import type {TimedWord, TimingFile} from '../src/types';
import {episodeDir, fail, flag, loadEpisode, parseArgs, printTimeline, probeDurationMs, requireId, ROOT, run, str} from './_lib';

const WHISPER_DIR = path.join(ROOT, '.whisper');
const WHISPER_VERSION = '1.5.5';
const MODELS = ['tiny', 'base', 'small', 'medium', 'large-v1', 'large-v2', 'large-v3'] as const;
type Model = (typeof MODELS)[number];

const main = async () => {
	const args = parseArgs();
	const id = requireId(args, 'npm run transcribe <id> [--model medium] [--lang fr]');
	const episode = loadEpisode(id);
	const model = (str(flag(args, 'model')) ?? 'medium') as Model;
	if (!MODELS.includes(model)) fail(`Unknown model "${model}". Use one of: ${MODELS.join(', ')}`);
	const lang = str(flag(args, 'lang')) ?? 'fr';

	const audioFile = episode.voice?.file ?? 'voice.mp3';
	const audioPath = path.join(episodeDir(id), audioFile);
	if (!existsSync(audioPath)) fail(`No voice file at public/episodes/${id}/${audioFile}`);

	console.log('\n① Whisper.cpp (first run only: download + build)…');
	await installWhisperCpp({to: WHISPER_DIR, version: WHISPER_VERSION});
	await downloadWhisperModel({model, folder: WHISPER_DIR});

	console.log('② Converting audio to 16 kHz WAV…');
	const tmp = path.join(WHISPER_DIR, 'tmp');
	mkdirSync(tmp, {recursive: true});
	const wav = path.join(tmp, `${id}.wav`);
	const conv = run('npx', ['remotion', 'ffmpeg', '-y', '-i', audioPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav], {
		quiet: true,
	});
	if (!conv.ok || !existsSync(wav)) fail('Audio conversion failed. Is the voice file a valid MP3/WAV?');

	console.log(`③ Transcribing (${model}, ${lang})…`);
	// Giving Whisper the script as a prompt helps it spell names and terms the same way.
	const prompt = narrationText(episode).replace(/\s+/g, ' ').slice(0, 600);
	const whisperCppOutput = await transcribe({
		inputPath: wav,
		whisperPath: WHISPER_DIR,
		whisperCppVersion: WHISPER_VERSION,
		model,
		modelFolder: WHISPER_DIR,
		tokenLevelTimestamps: true,
		splitOnWord: true,
		language: lang,
		printOutput: false,
		additionalArgs: prompt ? ([['--prompt', prompt]] as [string, string][]) : [],
		onProgress: (p) => process.stdout.write(`\r   ${Math.round(p * 100)}%`),
	});
	process.stdout.write('\n');

	const {captions} = toCaptions({whisperCppOutput});

	// Whisper returns sub-word tokens; a token without a leading space continues the previous word.
	const words: TimedWord[] = [];
	for (const c of captions) {
		const text = c.text;
		if (!text.trim() || /^\s*\[.*\]\s*$/.test(text)) continue;
		const last = words[words.length - 1];
		if (last && !/^\s/.test(text)) {
			last.text += text;
			last.endMs = Math.max(last.endMs, c.endMs);
		} else {
			words.push({text: text.trim(), startMs: c.startMs, endMs: c.endMs});
		}
	}
	if (!words.length) fail('Whisper found no speech in the audio.');

	const durationMs = probeDurationMs(audioPath) ?? words[words.length - 1].endMs + 300;
	const timing: TimingFile = {source: 'whisper', audio: audioFile, durationMs, words};
	writeFileSync(path.join(episodeDir(id), 'timing.json'), `${JSON.stringify(timing, null, 1)}\n`);

	console.log(`✔ Saved timing.json (${words.length} words, ${(durationMs / 1000).toFixed(1)} s)`);
	printTimeline(id, durationMs);
	console.log(`Preview: npm run studio   ·   Render: npm run render ${id}\n`);
};

main().catch((e) => fail((e as Error).stack ?? String(e)));
