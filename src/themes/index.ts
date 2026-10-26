import {createContext, useContext} from 'react';
import type {Episode} from '../types';
import {montserrat, pressStart, vt323} from './fonts';
import type {Theme} from './types';

export type {Theme} from './types';

/** Modern flat explainer: soft gradients, rounded cards, smooth springs. */
export const clean: Theme = {
	name: 'clean',
	fonts: {
		title: montserrat,
		body: montserrat,
		caption: montserrat,
		titleWeight: 900,
		bodyWeight: 700,
		captionWeight: 800,
		titleCharEm: 0.74,
		bodyCharEm: 0.6,
		titleLineHeight: 1.05,
		bodyLineHeight: 1.2,
		bodyScale: 1,
	},
	colors: {
		bg: '#0F1020',
		bg2: '#1C1F3B',
		text: '#F7F5EF',
		muted: '#A9ACC7',
		accent: '#FFD23F',
		accent2: '#4CC9F0',
		accent3: '#F7567C',
		card: 'rgba(255, 255, 255, 0.07)',
		cardBorder: 'rgba(255, 255, 255, 0.14)',
		ink: '#0F1020',
	},
	radius: 40,
	border: 2,
	cardShadow: (s) => `0 ${24 * s}px ${60 * s}px rgba(0, 0, 0, 0.35)`,
	titleShadow: (s) => `0 ${6 * s}px ${30 * s}px rgba(0, 0, 0, 0.35)`,
	step: 1,
	spring: {damping: 14, mass: 0.8, stiffness: 120},
};

/** Retro pixel-art explainer: RPG dialog boxes, hard shadows, motion on threes. */
export const pixel: Theme = {
	name: 'pixel',
	fonts: {
		title: pressStart,
		body: vt323,
		caption: vt323,
		titleWeight: 400,
		bodyWeight: 400,
		captionWeight: 400,
		titleCharEm: 1,
		bodyCharEm: 0.5,
		titleLineHeight: 1.35,
		bodyLineHeight: 1.0,
		bodyScale: 1.45,
	},
	colors: {
		bg: '#1D2B53',
		bg2: '#0E1631',
		text: '#FFF1E8',
		muted: '#C2C3C7',
		accent: '#FFEC27',
		accent2: '#29ADFF',
		accent3: '#FF004D',
		card: '#0B1638',
		cardBorder: '#FFF1E8',
		ink: '#000000',
	},
	radius: 0,
	border: 6,
	cardShadow: (s) => `${10 * s}px ${10 * s}px 0 #000`,
	titleShadow: (s) => `${6 * s}px ${6 * s}px 0 #000`,
	step: 3,
	spring: {damping: 10, mass: 0.6, stiffness: 160},
};

export const THEMES = {clean, pixel};

export const getTheme = (episode: Episode): Theme => {
	const base = THEMES[episode.theme ?? 'clean'] ?? clean;
	return episode.accent ? {...base, colors: {...base.colors, accent: episode.accent}} : base;
};

export const ThemeContext = createContext<Theme>(clean);
export const useTheme = () => useContext(ThemeContext);
