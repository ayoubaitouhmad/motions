// The sync engine: turns an episode script + word timestamps into frame numbers.
//
// 1. The script (every scene's `say`) is split into tokens.
// 2. The voice's word timestamps are split into tokens the same way.
// 3. Both token lists are aligned (LCS with fuzzy matching), so a word Whisper
//    mishears or a number written as "5" vs "cinq" doesn't break anything.
// 4. Every script word gets a time; scenes start on their first word (or `at`),
//    and cues (`at`, `countAt`, ...) are looked up in the script.
//
// Pure functions only, so it can be unit-tested and used by the CLI scripts.

import type {
	CaptionPage,
	CaptionWord,
	Episode,
	FormatName,
	Scene,
	SceneTiming,
	TimedWord,
	Timeline,
	TimingFile,
} from '../types';
import {tokenize} from './text';

export const DEFAULTS = {
	fps: 30,
	speechRate: 2.6,
	endHold: 1.2,
	silentSceneDuration: 2,
	/** Scenes appear slightly before their first word. */
	sceneLeadMs: 120,
	/** Cues appear slightly before their word. */
	cueLeadMs: 60,
	minSceneMs: 400,
};

// ─────────────────────────── script words ───────────────────────────

export type ScriptWord = {
	text: string;
	scene: number;
	tokens: string[];
};

export const scriptWords = (episode: Episode): ScriptWord[] => {
	const out: ScriptWord[] = [];
	episode.scenes.forEach((scene, i) => {
		for (const text of (scene.say ?? '').split(/\s+/)) {
			if (text) out.push({text, scene: i, tokens: tokenize(text)});
		}
	});
	return out;
};

/** The full narration, one paragraph per scene. Used for TTS and for printing. */
export const narrationText = (episode: Episode): string =>
	episode.scenes
		.map((s) => (s.say ?? '').trim())
		.filter(Boolean)
		.join('\n\n');

// ─────────────────────────── placeholder timing ───────────────────────────

/** Fake word timestamps from the script, used until there's a real voice. */
export const placeholderTiming = (episode: Episode): TimingFile => {
	const wps = episode.speechRate ?? DEFAULTS.speechRate;
	const words: TimedWord[] = [];
	let t = 250;
	let prevScene = -1;
	for (const w of scriptWords(episode)) {
		if (prevScene !== -1 && w.scene !== prevScene) t += 350;
		prevScene = w.scene;
		const letters = w.tokens.join('').length || 1;
		const dur = (1000 / wps) * (0.55 + (0.45 * letters) / 5);
		words.push({text: w.text, startMs: Math.round(t), endMs: Math.round(t + dur)});
		t += dur;
		if (/[.!?…]["»”)]*$/.test(w.text)) t += 400;
		else if (/[,;:]["»”)]*$/.test(w.text)) t += 180;
	}
	return {source: 'elevenlabs', audio: '', durationMs: Math.round(t), words};
};

// ─────────────────────────── alignment ───────────────────────────

type Tok = {norm: string; startMs: number; endMs: number};

/** Split timed words into tokens, sharing each word's time by token length. */
export const timedTokens = (words: TimedWord[]): Tok[] => {
	const out: Tok[] = [];
	for (const w of words) {
		const toks = tokenize(w.text);
		if (!toks.length) continue;
		const total = toks.reduce((n, t) => n + t.length, 0);
		let cursor = w.startMs;
		for (const t of toks) {
			const share = ((w.endMs - w.startMs) * t.length) / total;
			out.push({norm: t, startMs: cursor, endMs: cursor + share});
			cursor += share;
		}
	}
	return out;
};

const levenshtein = (a: string, b: string): number => {
	const prev = Array.from({length: b.length + 1}, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		let diag = prev[0];
		prev[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const tmp = prev[j];
			prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
			diag = tmp;
		}
	}
	return prev[b.length];
};

export const similar = (a: string, b: string): boolean => {
	if (a === b) return true;
	if (Math.min(a.length, b.length) < 4) return false;
	return 1 - levenshtein(a, b) / Math.max(a.length, b.length) >= 0.75;
};

/** Longest common subsequence with fuzzy equality. Returns, for each a[i], the matched b index or -1. */
export const align = (a: string[], b: string[]): number[] => {
	const n = a.length;
	const m = b.length;
	const W = m + 1;
	const dp = new Uint32Array((n + 1) * W);
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i * W + j] = similar(a[i], b[j])
				? dp[(i + 1) * W + j + 1] + 1
				: Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
		}
	}
	const map = new Array<number>(n).fill(-1);
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (similar(a[i], b[j]) && dp[i * W + j] === dp[(i + 1) * W + j + 1] + 1) {
			map[i] = j;
			i++;
			j++;
		} else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) {
			i++;
		} else {
			j++;
		}
	}
	return map;
};

/** Give every script token a time, interpolating the ones the voice didn't match. */
const timeScriptTokens = (
	script: string[],
	voice: Tok[],
	durationMs: number,
): {start: number[]; end: number[]; matched: number} => {
	const map = align(
		script,
		voice.map((t) => t.norm),
	);
	const n = script.length;
	const start = new Array<number>(n).fill(NaN);
	const end = new Array<number>(n).fill(NaN);
	let matched = 0;
	map.forEach((j, i) => {
		if (j >= 0) {
			start[i] = voice[j].startMs;
			end[i] = voice[j].endMs;
			matched++;
		}
	});
	if (matched === 0) {
		// Nothing matched: spread the script evenly over the audio.
		for (let i = 0; i < n; i++) {
			start[i] = (durationMs * i) / n;
			end[i] = (durationMs * (i + 1)) / n;
		}
		return {start, end, matched};
	}
	const STEP = 250;
	let i = 0;
	while (i < n) {
		if (!Number.isNaN(start[i])) {
			i++;
			continue;
		}
		let k = i;
		while (k < n && Number.isNaN(start[k])) k++;
		const gap = k - i;
		const from = i > 0 ? end[i - 1] : Math.max(0, start[k] - gap * STEP);
		const to = k < n ? start[k] : Math.min(durationMs, from + gap * STEP);
		const span = Math.max(0, to - from);
		for (let x = 0; x < gap; x++) {
			start[i + x] = from + (span * x) / gap;
			end[i + x] = from + (span * (x + 1)) / gap;
		}
		i = k;
	}
	return {start, end, matched};
};

// ─────────────────────────── cues ───────────────────────────

/** Find a phrase in the script tokens. Exact first, then fuzzy. Returns the token index or -1. */
export const findPhrase = (tokens: string[], phrase: string, from = 0, to = tokens.length): number => {
	const p = tokenize(phrase);
	if (!p.length) return -1;
	for (const eq of [(x: string, y: string) => x === y, similar]) {
		for (let i = Math.max(0, from); i + p.length <= Math.min(to, tokens.length); i++) {
			if (p.every((t, k) => eq(tokens[i + k], t))) return i;
		}
	}
	return -1;
};

type CueSpec = {key: string; at?: string; fallback: number};

/** Which cues a scene type has. `fallback` is a 0–1 position in the scene's narration. */
const cueSpecs = (scene: Scene): CueSpec[] => {
	switch (scene.type) {
		case 'bullets':
			return scene.items.map((item, i) => ({
				key: `item-${i}`,
				at: item.at,
				fallback: i / scene.items.length,
			}));
		case 'stat':
			return [{key: 'count', at: scene.countAt, fallback: 0}];
		case 'compare':
			return [
				{key: 'left', at: scene.left.at, fallback: 0},
				{key: 'right', at: scene.right.at, fallback: 0.5},
			];
		case 'definition':
			return [{key: 'definition', at: scene.definitionAt, fallback: 0.4}];
		default:
			return [];
	}
};

// ─────────────────────────── captions ───────────────────────────

export const paginateCaptions = (words: CaptionWord[], format: FormatName = 'vertical'): CaptionPage[] => {
	const maxChars = format === 'horizontal' ? 38 : 22;
	const maxWords = format === 'horizontal' ? 7 : 4;
	const pages: CaptionPage[] = [];
	let cur: CaptionWord[] = [];
	const flush = () => {
		if (!cur.length) return;
		pages.push({startMs: cur[0].startMs, endMs: cur[cur.length - 1].endMs, words: cur});
		cur = [];
	};
	words.forEach((w, i) => {
		const len = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
		if (cur.length && (len > maxChars || cur.length >= maxWords)) flush();
		cur.push(w);
		const next = words[i + 1];
		const sentenceEnd = /[.!?…:;]["»”)]*$/.test(w.text);
		const pause = next ? next.startMs - w.endMs > 500 : true;
		if (sentenceEnd || pause) flush();
	});
	flush();
	// Keep each page on screen until the next one starts (unless there's a long pause).
	pages.forEach((p, i) => {
		const next = pages[i + 1];
		p.endMs = next && next.startMs - p.endMs < 900 ? next.startMs : p.endMs + 400;
	});
	return pages;
};

// ─────────────────────────── the timeline ───────────────────────────

/** Stretch estimated timing to a real audio length (voice exists, timing.json doesn't yet). */
const stretch = (t: TimingFile, targetMs: number): TimingFile => {
	const k = targetMs / Math.max(1, t.durationMs);
	return {
		...t,
		durationMs: targetMs,
		words: t.words.map((w) => ({...w, startMs: w.startMs * k, endMs: w.endMs * k})),
	};
};

export const buildTimeline = ({
	episode,
	timing,
	fps = DEFAULTS.fps,
	audioMs = null,
}: {
	episode: Episode;
	timing: TimingFile | null;
	fps?: number;
	/** Real length of the voice file, when known. */
	audioMs?: number | null;
}): Timeline => {
	const warnings: string[] = [];
	const mode = timing ? 'synced' : 'placeholder';
	let t: TimingFile;
	if (timing) {
		t = audioMs ? {...timing, durationMs: Math.max(timing.durationMs, audioMs)} : timing;
	} else {
		const estimate = placeholderTiming(episode);
		t = audioMs ? stretch(estimate, audioMs) : estimate;
	}
	const toFrame = (ms: number) => Math.round((ms * fps) / 1000);

	// Script words -> flat token list, remembering which word each token belongs to.
	const words = scriptWords(episode);
	const tokens: string[] = [];
	const tokenWord: number[] = [];
	const wordFirstToken: number[] = [];
	words.forEach((w, wi) => {
		wordFirstToken.push(tokens.length);
		for (const tk of w.tokens) {
			tokens.push(tk);
			tokenWord.push(wi);
		}
	});

	const voiceTokens = timedTokens(t.words);
	const lastVoiceEnd = voiceTokens.length ? voiceTokens[voiceTokens.length - 1].endMs : 0;
	const speechMs = Math.max(t.durationMs, lastVoiceEnd);
	const {start, end, matched} = timeScriptTokens(tokens, voiceTokens, speechMs);

	if (timing && tokens.length) {
		const ratio = matched / tokens.length;
		if (ratio < 0.6) {
			warnings.push(
				`Only ${Math.round(ratio * 100)}% of the script matches the voice. ` +
					'Did the script change after the voice was made? Re-run `npm run voice` or `npm run transcribe`.',
			);
		}
	}

	// First token of each scene (or -1 when the scene has no narration).
	const sceneFirstToken = episode.scenes.map((_, si) => {
		const wi = words.findIndex((w) => w.scene === si && w.tokens.length);
		return wi === -1 ? -1 : wordFirstToken[wi];
	});

	// Scene start times.
	const lastSpeechMs = speechMs;
	const endHoldMs = (episode.endHold ?? DEFAULTS.endHold) * 1000;
	const startMs: (number | null)[] = [];
	let searchFrom = 0;
	episode.scenes.forEach((scene, si) => {
		let tokenIdx = sceneFirstToken[si];
		if (scene.at) {
			const found = findPhrase(tokens, scene.at, searchFrom);
			if (found === -1) {
				warnings.push(`Scene ${si + 1}: couldn't find at "${scene.at}" in the narration.`);
			} else {
				tokenIdx = found;
			}
		}
		if (tokenIdx === -1) {
			startMs.push(null); // silent scene, placed after the narration
			return;
		}
		searchFrom = tokenIdx;
		startMs.push(si === 0 ? 0 : Math.max(0, start[tokenIdx] - DEFAULTS.sceneLeadMs));
	});

	// Silent scenes: only allowed at the end.
	const narrated = startMs.map((s) => s !== null);
	const lastNarrated = narrated.lastIndexOf(true);
	episode.scenes.forEach((s, si) => {
		if (!narrated[si] && si < lastNarrated) {
			warnings.push(`Scene ${si + 1} has no \`say\` or \`at\`, so it was skipped. Silent scenes must be last.`);
		}
	});
	if (lastNarrated === -1) {
		warnings.push('No scene has a `say` text yet.');
	}

	// Force scene starts to be increasing.
	let prev = -Infinity;
	startMs.forEach((s, si) => {
		if (s === null) return;
		if (s < prev + DEFAULTS.minSceneMs) {
			warnings.push(`Scene ${si + 1} starts too soon after the previous one. Check its \`at\`.`);
			startMs[si] = prev + DEFAULTS.minSceneMs;
		}
		prev = startMs[si] as number;
	});

	// Build scene timings.
	const narrationEndMs = (lastNarrated === -1 ? 0 : lastSpeechMs) + endHoldMs;
	const scenes: SceneTiming[] = [];
	let tailCursor = toFrame(narrationEndMs);
	episode.scenes.forEach((scene, si) => {
		const s = startMs[si];
		if (s === null) {
			if (si > lastNarrated) {
				const dur = Math.max(1, toFrame((scene.duration ?? DEFAULTS.silentSceneDuration) * 1000));
				scenes.push({index: si, startFrame: tailCursor, durationInFrames: dur, cues: {}});
				tailCursor += dur;
			}
			return;
		}
		const nextIdx = startMs.findIndex((x, k) => k > si && x !== null);
		const sceneEndMs = nextIdx === -1 ? narrationEndMs : (startMs[nextIdx] as number);
		const startFrame = toFrame(s);
		const durationInFrames = Math.max(1, toFrame(sceneEndMs) - startFrame);

		// Token range of this scene's own narration.
		const firstTok = sceneFirstToken[si];
		const nextFirst = sceneFirstToken.slice(si + 1).find((x) => x !== -1);
		const rangeEnd = nextFirst ?? tokens.length;

		const cues: Record<string, number> = {};
		for (const spec of cueSpecs(scene)) {
			let ms: number | null = null;
			if (spec.at) {
				let idx = findPhrase(tokens, spec.at, firstTok, rangeEnd);
				if (idx === -1) idx = findPhrase(tokens, spec.at, Math.max(0, firstTok));
				if (idx === -1) {
					warnings.push(`Scene ${si + 1}: couldn't find "${spec.at}" in the narration.`);
				} else {
					ms = start[idx] - DEFAULTS.cueLeadMs;
				}
			}
			if (ms === null) {
				if (firstTok !== -1 && rangeEnd > firstTok) {
					const idx = firstTok + Math.floor(spec.fallback * (rangeEnd - firstTok));
					ms = spec.fallback === 0 ? s : start[Math.min(idx, rangeEnd - 1)] - DEFAULTS.cueLeadMs;
				} else {
					ms = s + spec.fallback * (sceneEndMs - s);
				}
			}
			const rel = toFrame(ms) - startFrame;
			cues[spec.key] = Math.max(spec.fallback === 0 && !spec.at ? 6 : 0, Math.min(durationInFrames - 1, rel));
		}
		scenes.push({index: si, startFrame, durationInFrames, cues});
	});

	// Caption words: the script's own spelling, with the voice's timing.
	const captionWords: CaptionWord[] = [];
	words.forEach((w, wi) => {
		if (!w.tokens.length) {
			// Punctuation-only word ("—", "!"): glue to the previous word.
			const last = captionWords[captionWords.length - 1];
			if (last) last.text += ` ${w.text}`;
			return;
		}
		const first = wordFirstToken[wi];
		const lastTok = first + w.tokens.length - 1;
		captionWords.push({text: w.text, startMs: Math.round(start[first]), endMs: Math.round(end[lastTok])});
	});

	return {
		mode,
		source: timing ? timing.source : 'estimate',
		durationInFrames: Math.max(1, tailCursor),
		scenes,
		captions: paginateCaptions(captionWords, episode.format ?? 'vertical'),
		warnings,
	};
};

/** Debug helper: "Scene 2 (bullets) 0:04.3 → 0:11.0". */
export const describeTimeline = (episode: Episode, timeline: Timeline, fps = DEFAULTS.fps): string[] => {
	const ts = (f: number) => {
		const s = f / fps;
		return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
	};
	return timeline.scenes.map((sc) => {
		const scene = episode.scenes[sc.index];
		const cues = Object.entries(sc.cues)
			.map(([k, f]) => `${k}@${ts(sc.startFrame + f)}`)
			.join(' ');
		return `Scene ${sc.index + 1} (${scene.type}) ${ts(sc.startFrame)} → ${ts(sc.startFrame + sc.durationInFrames)} ${cues}`;
	});
};
