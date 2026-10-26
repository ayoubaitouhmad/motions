// npm run voice <id> [--voice <voiceId>] [--model eleven_multilingual_v2]
//
// Generates the voice-over with ElevenLabs straight from the episode script,
// with exact word timestamps, so the video is synced without any transcription.
// Needs ELEVENLABS_API_KEY in your environment or in a .env file.
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {narrationText} from '../src/lib/timeline';
import type {TimedWord, TimingFile} from '../src/types';
import {episodeDir, fail, flag, loadDotEnv, loadEpisode, parseArgs, printTimeline, requireId, str} from './_lib';

type Alignment = {
	characters: string[];
	character_start_times_seconds: number[];
	character_end_times_seconds: number[];
};

type TtsResponse = {
	audio_base64: string;
	alignment: Alignment | null;
	normalized_alignment: Alignment | null;
};

/** Characters with times -> words with times. */
const wordsFromAlignment = (a: Alignment): TimedWord[] => {
	const words: TimedWord[] = [];
	let text = '';
	let start = 0;
	let end = 0;
	const flush = () => {
		if (text) words.push({text, startMs: Math.round(start * 1000), endMs: Math.round(end * 1000)});
		text = '';
	};
	a.characters.forEach((ch, i) => {
		if (/\s/.test(ch)) {
			flush();
			return;
		}
		if (!text) start = a.character_start_times_seconds[i];
		text += ch;
		end = a.character_end_times_seconds[i];
	});
	flush();
	return words;
};

const main = async () => {
	loadDotEnv();
	const args = parseArgs();
	const id = requireId(args, 'npm run voice <id> [--voice <voiceId>] [--model <model>]');
	const episode = loadEpisode(id);

	const apiKey = process.env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		fail('ELEVENLABS_API_KEY is not set.\n  Create a .env file in the project root with:\n  ELEVENLABS_API_KEY=your_key_here');
	}
	const voiceId = str(flag(args, 'voice')) ?? episode.voice?.voiceId;
	if (!voiceId) {
		fail(
			`No voice chosen. Pass --voice <voiceId> or set "voice": {"voiceId": "..."} in episode.json.\n` +
				'  Find voice IDs in ElevenLabs → Voices → (your voice) → Copy voice ID.',
		);
	}
	const model = str(flag(args, 'model')) ?? episode.voice?.model ?? 'eleven_multilingual_v2';
	const text = narrationText(episode);
	if (!text) fail('This episode has no narration yet. Fill in the "say" fields first.');

	console.log(`\n🎙  ElevenLabs · voice ${voiceId} · ${model} · ${text.length} characters…`);
	const res = await fetch(
		`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId!)}/with-timestamps?output_format=mp3_44100_128`,
		{
			method: 'POST',
			headers: {'xi-api-key': apiKey!, 'Content-Type': 'application/json', Accept: 'application/json'},
			body: JSON.stringify({text, model_id: model}),
		},
	);
	if (!res.ok) {
		fail(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 500)}`);
	}
	const data = (await res.json()) as TtsResponse;
	const alignment = data.alignment ?? data.normalized_alignment;
	if (!data.audio_base64 || !alignment) fail('ElevenLabs response had no audio or no timestamps.');

	const dir = episodeDir(id);
	const audioFile = episode.voice?.file ?? 'voice.mp3';
	writeFileSync(path.join(dir, audioFile), Buffer.from(data.audio_base64, 'base64'));

	const words = wordsFromAlignment(alignment!);
	const lastEnd = alignment!.character_end_times_seconds.at(-1) ?? 0;
	const timing: TimingFile = {
		source: 'elevenlabs',
		audio: audioFile,
		durationMs: Math.round(lastEnd * 1000) + 150,
		words,
	};
	writeFileSync(path.join(dir, 'timing.json'), `${JSON.stringify(timing, null, 1)}\n`);

	// Remember the voice for next time.
	if (str(flag(args, 'voice')) && episode.voice?.voiceId !== voiceId) {
		episode.voice = {...episode.voice, voiceId};
		writeFileSync(path.join(dir, 'episode.json'), `${JSON.stringify(episode, null, 2)}\n`);
	}

	console.log(`✔ Saved ${audioFile} and timing.json (${words.length} words, ${lastEnd.toFixed(1)} s)`);
	printTimeline(id);
	console.log(`Preview: npm run studio   ·   Render: npm run render ${id}\n`);
};

main().catch((e) => fail((e as Error).stack ?? String(e)));
