import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';
import {
	align,
	buildTimeline,
	findPhrase,
	paginateCaptions,
	placeholderTiming,
	scriptWords,
} from '../src/lib/timeline';
import {emphasisWords, fitFontSize, formatNumber, tokenize} from '../src/lib/text';
import type {Episode, TimedWord, TimingFile} from '../src/types';

const demo: Episode = JSON.parse(
	readFileSync(join(__dirname, '..', 'public', 'episodes', 'demo', 'episode.json'), 'utf8'),
);
const FPS = 30;

test('tokenize folds accents, apostrophes, ligatures and numbers', () => {
	assert.deepEqual(tokenize("L'eau, 5 fois !"), ['l', 'eau', 'cinq', 'fois']);
	assert.deepEqual(tokenize('Œil émerveillé — ÇA'), ['oeil', 'emerveille', 'ca']);
	assert.deepEqual(tokenize('…'), []);
});

test('emphasis and number helpers', () => {
	assert.deepEqual(emphasisWords('Le ciel **très bleu** ?'), [
		{text: 'Le', em: false},
		{text: 'ciel', em: false},
		{text: 'très', em: true},
		{text: 'bleu', em: true, tail: '\u00A0?'},
	]);
	assert.equal(formatNumber(1250.5, 1), '1 250,5');
	assert.equal(formatNumber(5), '5');
	assert.equal(formatNumber(-1234567), '-1 234 567');
});

test('fitFontSize keeps the longest word on one line', () => {
	const size = fitFontSize({text: 'Diffusion Rayleigh', maxWidth: 900, maxSize: 140, charEm: 1});
	assert.ok(size * 9 <= 900, `9 chars at ${size}px must fit 900px`);
	assert.equal(fitFontSize({text: 'Hi', maxWidth: 900, maxSize: 140, charEm: 1}), 140);
});

test('align tolerates mishearings, insertions and deletions', () => {
	const script = ['la', 'diffusion', 'rayleigh', 'est', 'cinq', 'fois', 'plus'];
	const voice = ['euh', 'la', 'diffusion', 'raylei', 'cinq', 'fois', 'plus', 'merci'];
	const map = align(script, voice);
	assert.deepEqual(map, [1, 2, 3, -1, 4, 5, 6]);
});

test('findPhrase finds exact and fuzzy phrases from a position', () => {
	const toks = tokenize('le rouge avec de grandes ondes le bleu avec de petites ondes');
	assert.equal(findPhrase(toks, 'le bleu avec'), 6);
	assert.equal(findPhrase(toks, 'ondes', 6), 11);
	assert.equal(findPhrase(toks, 'Grandes Öndes'), 4);
	assert.equal(findPhrase(toks, 'introuvable'), -1);
});

test('placeholder timeline: ordered scenes, cues inside scenes, no warnings', () => {
	const tl = buildTimeline({episode: demo, timing: null, fps: FPS});
	assert.equal(tl.mode, 'placeholder');
	assert.deepEqual(tl.warnings, []);
	assert.equal(tl.scenes.length, demo.scenes.length);
	const seconds = tl.durationInFrames / FPS;
	assert.ok(seconds > 55 && seconds < 85, `demo should last 55–85 s, got ${seconds.toFixed(1)}`);
	let prevEnd = 0;
	for (const s of tl.scenes) {
		assert.equal(s.startFrame, prevEnd, `scene ${s.index + 1} must start where the previous ends`);
		prevEnd = s.startFrame + s.durationInFrames;
		for (const [k, f] of Object.entries(s.cues)) {
			assert.ok(f >= 0 && f < s.durationInFrames, `cue ${k} of scene ${s.index + 1} outside scene`);
		}
	}
	assert.equal(prevEnd, tl.durationInFrames);
	// Bullet items appear in order.
	const bullets = tl.scenes[1].cues;
	assert.ok(bullets['item-0'] < bullets['item-1'] && bullets['item-1'] < bullets['item-2']);
});

test('synced timeline follows a slower, imperfect transcript', () => {
	// Simulate Whisper: 1.25x slower, a few mishearings, a filler word, a dropped word.
	const base = placeholderTiming(demo).words;
	const words: TimedWord[] = [];
	base.forEach((w, i) => {
		if (i === 20) return; // dropped
		let text = w.text;
		if (/Rayleigh/.test(text)) text = text.replace('Rayleigh', 'Rayley');
		if (text === 'cinq') text = '5';
		if (text === 'émet') text = 'aimait';
		words.push({text: ` ${text}`, startMs: w.startMs * 1.25, endMs: w.endMs * 1.25});
		if (i === 40) words.push({text: ' euh', startMs: w.endMs * 1.25, endMs: w.endMs * 1.25 + 100});
	});
	const timing: TimingFile = {
		source: 'whisper',
		audio: 'voice.mp3',
		durationMs: words[words.length - 1].endMs + 300,
		words,
	};
	const tl = buildTimeline({episode: demo, timing, fps: FPS});
	assert.equal(tl.mode, 'synced');
	assert.deepEqual(tl.warnings, []);

	// Scene 4 (stat) should start right before "Et surtout" in the transcript.
	const etSurtout = words.find((w, i) => w.text.trim() === 'Et' && words[i + 1]?.text.trim().startsWith('surtout'));
	assert.ok(etSurtout);
	const expected = Math.round(((etSurtout.startMs - 120) * FPS) / 1000);
	assert.ok(Math.abs(tl.scenes[3].startFrame - expected) <= 1);

	// "cinq fois" cue matches the transcript's "5 fois".
	const five = words.find((w) => w.text.trim() === '5');
	assert.ok(five);
	const countFrame = tl.scenes[3].startFrame + tl.scenes[3].cues.count;
	assert.ok(Math.abs(countFrame - Math.round(((five.startMs - 60) * FPS) / 1000)) <= 1);

	// Captions keep the script's spelling, not the transcript's.
	const allCaptionText = tl.captions.flatMap((p) => p.words.map((w) => w.text)).join(' ');
	assert.ok(allCaptionText.includes('Rayleigh.'));
	assert.ok(!allCaptionText.includes('Rayley '));
});

test('a voice for a different script raises a warning', () => {
	const timing: TimingFile = {
		source: 'whisper',
		audio: 'voice.mp3',
		durationMs: 5000,
		words: 'bonjour à tous bienvenue sur la chaîne'
			.split(' ')
			.map((text, i) => ({text, startMs: i * 500, endMs: i * 500 + 400})),
	};
	const tl = buildTimeline({episode: demo, timing, fps: FPS});
	assert.ok(tl.warnings.some((w) => w.includes('matches the voice')));
	assert.ok(tl.durationInFrames > 0);
});

test('silent outro is appended after the narration', () => {
	const ep: Episode = {
		title: 't',
		scenes: [
			{type: 'hook', title: 'A', say: 'Un deux trois.'},
			{type: 'outro', title: 'Fin', duration: 3},
		],
	};
	const tl = buildTimeline({episode: ep, timing: null, fps: FPS});
	assert.equal(tl.scenes.length, 2);
	assert.equal(tl.scenes[1].durationInFrames, 90);
	assert.equal(tl.scenes[1].startFrame, tl.scenes[0].startFrame + tl.scenes[0].durationInFrames);
	assert.equal(tl.durationInFrames, tl.scenes[1].startFrame + 90);
});

test('captions are paginated into short pages', () => {
	const words = scriptWords(demo).map((w, i) => ({text: w.text, startMs: i * 300, endMs: i * 300 + 250}));
	const pages = paginateCaptions(words, 'vertical');
	for (const p of pages) {
		assert.ok(p.words.length <= 4);
		assert.ok(p.endMs >= p.startMs);
	}
	assert.equal(
		pages.reduce((n, p) => n + p.words.length, 0),
		words.length,
	);
});
