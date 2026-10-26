import type {ThemeName} from '../types';

export type Theme = {
	name: ThemeName;
	fonts: {
		title: string;
		body: string;
		caption: string;
		titleWeight: number;
		bodyWeight: number;
		captionWeight: number;
		/** Average glyph width in em, used to fit titles without overflow. */
		titleCharEm: number;
		bodyCharEm: number;
		titleLineHeight: number;
		bodyLineHeight: number;
		/** Pixel fonts look small next to regular fonts: multiply body sizes by this. */
		bodyScale: number;
	};
	colors: {
		bg: string;
		bg2: string;
		text: string;
		muted: string;
		accent: string;
		accent2: string;
		accent3: string;
		card: string;
		cardBorder: string;
		ink: string;
	};
	/** Corner radius in px at 1080p. */
	radius: number;
	/** Card border width in px at 1080p. */
	border: number;
	/** CSS box-shadow for cards, at scale `s`. */
	cardShadow: (s: number) => string;
	/** CSS text-shadow for big titles, at scale `s`. */
	titleShadow: (s: number) => string;
	/** 1 = smooth motion. 3 = animate "on threes" for a retro, choppy feel. */
	step: number;
	spring: {damping: number; mass: number; stiffness: number};
};
