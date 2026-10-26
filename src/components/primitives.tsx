// Small building blocks shared by every scene.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {emphasisWords, nbsp, plain} from '../lib/text';
import {useTheme} from '../themes';
import {useLayout} from './layout';

export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** The current frame, quantized for themes that animate "on threes". */
export const useStepFrame = (): number => {
	const frame = useCurrentFrame();
	const {step} = useTheme();
	return step > 1 ? Math.floor(frame / step) * step : frame;
};

/** 0 → 1 entrance progress that starts at `delay` frames. */
export const useEnter = (delay = 0): number => {
	const frame = useStepFrame();
	const {fps} = useVideoConfig();
	const theme = useTheme();
	if (frame < delay) return 0;
	return spring({frame: frame - delay, fps, config: theme.spring});
};

type From = 'up' | 'down' | 'left' | 'right' | 'scale' | 'none';

const enterTransform = (p: number, from: From, s: number): string => {
	const d = (1 - p) * 80 * s;
	switch (from) {
		case 'up':
			return `translateY(${d}px)`;
		case 'down':
			return `translateY(${-d}px)`;
		case 'left':
			return `translateX(${-d * 1.5}px)`;
		case 'right':
			return `translateX(${d * 1.5}px)`;
		case 'scale':
			return `scale(${0.4 + 0.6 * p})`;
		default:
			return 'none';
	}
};

/** Animate children in at `delay` frames. */
export const Pop: React.FC<{
	delay?: number;
	from?: From;
	style?: React.CSSProperties;
	children: React.ReactNode;
}> = ({delay = 0, from = 'up', style, children}) => {
	const p = useEnter(delay);
	const {s} = useLayout();
	return (
		<div
			style={{
				opacity: Math.min(1, p * 1.6),
				transform: enterTransform(p, from, s),
				...style,
			}}
		>
			{children}
		</div>
	);
};

/** Text with **emphasis** in the accent color. */
export const Rich: React.FC<{text: string; color?: string; style?: React.CSSProperties}> = ({
	text,
	color,
	style,
}) => {
	const theme = useTheme();
	return (
		<span style={style}>
			{nbsp(text).split('**').map((part, i) =>
				i % 2 === 1 ? (
					<span key={i} style={{color: color ?? theme.colors.accent}}>
						{part}
					</span>
				) : (
					<React.Fragment key={i}>{part}</React.Fragment>
				),
			)}
		</span>
	);
};

/** Words fly in one by one. Supports **emphasis**. */
export const KineticText: React.FC<{
	text: string;
	delay?: number;
	perWord?: number;
	style?: React.CSSProperties;
}> = ({text, delay = 0, perWord = 3, style}) => {
	const theme = useTheme();
	const frame = useStepFrame();
	const {fps} = useVideoConfig();
	const {s} = useLayout();
	const words = emphasisWords(text);
	return (
		<div style={{...style, display: 'flex', flexWrap: 'wrap', justifyContent: style?.textAlign === 'left' ? 'flex-start' : 'center', columnGap: '0.28em'}}>
			{words.map((w, i) => {
				const start = delay + i * perWord;
				const p = frame < start ? 0 : spring({frame: frame - start, fps, config: theme.spring});
				return (
					<span
						key={i}
						style={{
							display: 'inline-block',
							whiteSpace: 'nowrap',
							opacity: Math.min(1, p * 2),
							transform: `translateY(${(1 - p) * 60 * s}px) rotate(${(1 - p) * (i % 2 ? 4 : -4)}deg)`,
						}}
					>
						<span style={{color: w.em ? theme.colors.accent : undefined}}>{w.text}</span>
						{w.tail}
					</span>
				);
			})}
		</div>
	);
};

/** Themed box: rounded glass card (clean) or RPG dialog box (pixel). */
export const Card: React.FC<{
	children: React.ReactNode;
	highlight?: string;
	style?: React.CSSProperties;
}> = ({children, highlight, style}) => {
	const theme = useTheme();
	const {s} = useLayout();
	const pixel = theme.name === 'pixel';
	return (
		<div
			style={{
				position: 'relative',
				background: theme.colors.card,
				border: `${Math.max(1, theme.border * s)}px solid ${highlight ?? theme.colors.cardBorder}`,
				borderRadius: theme.radius * s,
				boxShadow: theme.cardShadow(s),
				padding: `${(pixel ? 30 : 34) * s}px ${(pixel ? 34 : 40) * s}px`,
				// Pixel dialog boxes get an inner line, like old RPGs.
				outline: pixel ? `${3 * s}px solid ${theme.colors.bg2}` : undefined,
				outlineOffset: pixel ? `${-12 * s}px` : undefined,
				...style,
			}}
		>
			{children}
		</div>
	);
};

/** Small label above a title. */
export const Kicker: React.FC<{text: string; delay?: number; color?: string}> = ({text, delay = 0, color}) => {
	const theme = useTheme();
	const {s} = useLayout();
	const p = useEnter(delay);
	const pixel = theme.name === 'pixel';
	return (
		<div style={{display: 'flex', justifyContent: 'center'}}>
			<div
				style={{
					opacity: Math.min(1, p * 2),
					transform: `scale(${0.6 + 0.4 * p})`,
					background: color ?? theme.colors.accent,
					color: theme.colors.ink,
					fontFamily: theme.fonts.title,
					fontWeight: theme.fonts.titleWeight,
					fontSize: (pixel ? 30 : 38) * s,
					letterSpacing: pixel ? 0 : '0.08em',
					padding: `${(pixel ? 16 : 12) * s}px ${(pixel ? 22 : 30) * s}px`,
					borderRadius: pixel ? 0 : 999,
					boxShadow: pixel ? `${6 * s}px ${6 * s}px 0 #000` : undefined,
					whiteSpace: 'nowrap',
				}}
			>
				{plain(text)}
			</div>
		</div>
	);
};

/** Emoji with a gentle float. */
export const Emoji: React.FC<{char: string; size: number; delay?: number; float?: boolean}> = ({
	char,
	size,
	delay = 0,
	float = true,
}) => {
	const frame = useStepFrame();
	const p = useEnter(delay);
	const bob = float ? Math.sin((frame - delay) / 14) * size * 0.05 : 0;
	return (
		<div style={{display: 'flex', justifyContent: 'center'}}>
			<div
				style={{
					fontFamily: EMOJI_FONT,
					fontSize: size,
					lineHeight: 1,
					transform: `translateY(${bob}px) scale(${p}) rotate(${(1 - p) * -25}deg)`,
				}}
			>
				{char}
			</div>
		</div>
	);
};

/** Fade + shrink on the way out, so scenes don't cut abruptly. */
export const SceneFrame: React.FC<{durationInFrames: number; children: React.ReactNode}> = ({
	durationInFrames,
	children,
}) => {
	const frame = useCurrentFrame();
	const theme = useTheme();
	const exit = theme.name === 'pixel' ? 4 : 8;
	const p = interpolate(frame, [durationInFrames - exit, durationInFrames], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				opacity: theme.name === 'pixel' ? (p > 0.5 ? 1 : 0) : p,
				transform: `scale(${0.96 + 0.04 * p})`,
			}}
		>
			{children}
		</div>
	);
};
