// ─────────────────────────────────────────────────────────────
// Episode format — this is what you write in
// public/episodes/<id>/episode.json
// ─────────────────────────────────────────────────────────────

export type ThemeName = 'clean' | 'pixel';
export type FormatName = 'vertical' | 'square' | 'horizontal';

/**
 * A phrase from the narration. The element appears when the voice
 * says it. Accents, case and punctuation are ignored when matching.
 */
export type Cue = string;

export type BaseScene = {
	/** What the voice says during this scene. Leave empty only for a final silent scene. */
	say?: string;
	/** Optional: start the scene on this phrase instead of the first words of `say`. */
	at?: Cue;
	/** Seconds, only for a silent scene at the very end (no `say`). Default 2. */
	duration?: number;
};

export type ListItem = {
	text: string;
	emoji?: string;
	at?: Cue;
};

export type HookScene = BaseScene & {
	type: 'hook';
	/** Use **double stars** to highlight words in the accent color. */
	title: string;
	kicker?: string;
	emoji?: string;
};

export type BulletsScene = BaseScene & {
	type: 'bullets';
	title?: string;
	items: ListItem[];
	numbered?: boolean;
};

export type StatScene = BaseScene & {
	type: 'stat';
	value: number;
	prefix?: string;
	suffix?: string;
	decimals?: number;
	label: string;
	kicker?: string;
	/** Start counting when the voice says this. Default: scene start. */
	countAt?: Cue;
	/** Draw a 0–100 bar under the number (useful with suffix "%"). */
	bar?: boolean;
};

export type CompareSide = {
	label: string;
	emoji?: string;
	text?: string;
	at?: Cue;
};

export type CompareScene = BaseScene & {
	type: 'compare';
	title?: string;
	left: CompareSide;
	right: CompareSide;
};

export type DefinitionScene = BaseScene & {
	type: 'definition';
	kicker?: string;
	term: string;
	definition: string;
	/** Show the definition when the voice says this. Default: 40% into the scene. */
	definitionAt?: Cue;
};

export type ImageScene = BaseScene & {
	type: 'image';
	/** File inside the episode folder, e.g. "cloud.png". */
	src: string;
	title?: string;
	caption?: string;
	/** Ken Burns zoom direction. Default "in". */
	zoom?: 'in' | 'out' | 'none';
};

export type OutroScene = BaseScene & {
	type: 'outro';
	title: string;
	subtitle?: string;
	handle?: string;
	emoji?: string;
	button?: string;
};

export type Scene =
	| HookScene
	| BulletsScene
	| StatScene
	| CompareScene
	| DefinitionScene
	| ImageScene
	| OutroScene;

export type Episode = {
	title: string;
	theme?: ThemeName;
	format?: FormatName;
	fps?: number;
	/** Override the theme's accent color, e.g. "#FFD23F". */
	accent?: string;
	voice?: {
		/** Audio file in the episode folder. Default "voice.mp3". */
		file?: string;
		/** ElevenLabs voice used by `npm run voice`. */
		voiceId?: string;
		/** ElevenLabs model. Default "eleven_multilingual_v2". */
		model?: string;
		/** Narration volume 0–1. Default 1. */
		volume?: number;
	};
	music?: {
		file: string;
		/** 0–1. Default 0.08. */
		volume?: number;
	};
	/** Word-by-word subtitles. Default true. */
	captions?: boolean;
	/** Placeholder timing speed when there is no voice yet (words per second). Default 2.6. */
	speechRate?: number;
	/** Seconds kept after the last word. Default 1.2. */
	endHold?: number;
	scenes: Scene[];
};

// ─────────────────────────────────────────────────────────────
// Timing — written by `npm run voice` or `npm run transcribe`
// to public/episodes/<id>/timing.json
// ─────────────────────────────────────────────────────────────

export type TimedWord = {
	text: string;
	startMs: number;
	endMs: number;
};

export type TimingFile = {
	source: 'elevenlabs' | 'whisper';
	audio: string;
	durationMs: number;
	words: TimedWord[];
};

// ─────────────────────────────────────────────────────────────
// Timeline — computed from episode + timing, consumed by scenes
// ─────────────────────────────────────────────────────────────

export type TimingMode = 'synced' | 'placeholder';

export type SceneTiming = {
	index: number;
	startFrame: number;
	durationInFrames: number;
	/** Cue frames relative to the scene start, keyed by cue name ("item-0", "count", ...). */
	cues: Record<string, number>;
};

export type CaptionWord = {
	text: string;
	startMs: number;
	endMs: number;
};

export type CaptionPage = {
	startMs: number;
	endMs: number;
	words: CaptionWord[];
};

export type Timeline = {
	mode: TimingMode;
	source: TimingFile['source'] | 'estimate';
	durationInFrames: number;
	scenes: SceneTiming[];
	captions: CaptionPage[];
	warnings: string[];
};

export type ExplainerProps = {
	episodeId: string;
	/** Filled by calculateMetadata. */
	episode?: Episode;
	timeline?: Timeline;
	audioSrc?: string | null;
	/** Show timing info and warnings in the Studio (never in renders). */
	debug?: boolean;
};
