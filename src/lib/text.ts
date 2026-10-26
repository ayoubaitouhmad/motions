// Text helpers shared by the timeline engine, the scenes and the CLI scripts.
// Pure functions only: no React, no Remotion, no Node APIs.

const NUMBER_WORDS: Record<string, string> = {
	'0': 'zero',
	'1': 'un',
	'2': 'deux',
	'3': 'trois',
	'4': 'quatre',
	'5': 'cinq',
	'6': 'six',
	'7': 'sept',
	'8': 'huit',
	'9': 'neuf',
	'10': 'dix',
	'11': 'onze',
	'12': 'douze',
	'13': 'treize',
	'14': 'quatorze',
	'15': 'quinze',
	'16': 'seize',
	'20': 'vingt',
	'30': 'trente',
	'40': 'quarante',
	'50': 'cinquante',
	'60': 'soixante',
	'100': 'cent',
	'1000': 'mille',
};

/** Lowercase, strip accents and ligatures. */
export const fold = (s: string): string =>
	s
		.toLowerCase()
		.replace(/œ/g, 'oe')
		.replace(/æ/g, 'ae')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '');

/**
 * Split text into comparable tokens: "L'eau, 5 fois !" -> ["l", "eau", "cinq", "fois"].
 * Small numbers become words so "5" in the script matches "cinq" in a transcript.
 */
export const tokenize = (s: string): string[] =>
	fold(s)
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.map((t) => NUMBER_WORDS[t] ?? t);

/** Strip the **emphasis** markers. */
export const plain = (s: string): string => s.replace(/\*\*/g, '');

/**
 * French typography: keep "?", "!", ":", ";", "%" and "»" on the same line as the
 * word before them (and "«" with the word after), using non-breaking spaces.
 */
export const nbsp = (s: string): string => s.replace(/ ([?!:;%»])/g, '\u00A0$1').replace(/« /g, '«\u00A0');

export type Segment = {text: string; em: boolean; tail?: string};

/** "Le ciel est **bleu** ?" -> words with an `em` flag, for word-by-word reveals. */
export const emphasisWords = (s: string): Segment[] => {
	const out: Segment[] = [];
	s.split('**').forEach((part, i) => {
		const em = i % 2 === 1;
		for (const w of part.split(/\s+/)) {
			if (!w) continue;
			const prev = out[out.length - 1];
			// A lone "?" or "!" sticks to the previous word so it never wraps alone.
			if (prev && /^[?!:;%»]+$/.test(w)) prev.tail = `${prev.tail ?? ''}\u00A0${w}`;
			else out.push({text: w, em});
		}
	});
	return out;
};

/**
 * Pick a font size so the longest word fits on one line and the whole
 * text fits in `maxLines`. `charEm` is the average glyph width in em
 * (1.0 for a monospace pixel font, ~0.6 for a bold sans).
 */
export const fitFontSize = ({
	text,
	maxWidth,
	maxSize,
	minSize = 24,
	charEm,
	maxLines = 3,
}: {
	text: string;
	maxWidth: number;
	maxSize: number;
	minSize?: number;
	charEm: number;
	maxLines?: number;
}): number => {
	const clean = plain(text).trim();
	if (!clean) return maxSize;
	const longest = clean.split(/\s+/).reduce((m, w) => Math.max(m, [...w].length), 1);
	const total = [...clean].length;
	const byWord = maxWidth / (longest * charEm);
	// Wrapping wastes space at line ends; 0.8 keeps a safety margin.
	const byLines = (maxWidth * maxLines * 0.8) / (total * charEm);
	return Math.max(minSize, Math.floor(Math.min(maxSize, byWord, byLines)));
};

/** French number format with plain spaces (pixel fonts lack narrow no-break spaces): 1 250,5 */
export const formatNumber = (value: number, decimals = 0): string => {
	const [int, dec] = value.toFixed(decimals).split('.');
	const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	return dec ? `${grouped},${dec}` : grouped;
};

/** "Pourquoi le ciel !" -> "pourquoi-le-ciel" */
export const slugify = (s: string): string =>
	fold(s)
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
