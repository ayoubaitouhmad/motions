// Everything drawn around the scenes: background, progress bar, captions,
// pixel transitions, scanlines and the Studio-only debug overlay.
import React from 'react';
import {AbsoluteFill, getRemotionEnvironment, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useTheme} from '../themes';
import type {CaptionPage, Episode, Timeline} from '../types';
import {useLayout} from './layout';

/** "#29ADFF" + 0.2 -> "rgba(41, 173, 255, 0.2)". Other color formats pass through. */
export const alpha = (color: string, a: number): string => {
	const c = rgb(color);
	return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})` : color;
};

const rgb = (color: string): [number, number, number] | null => {
	const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
	if (!m) return null;
	const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
	const n = parseInt(hex, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Blend two hex colors. */
export const mix = (a: string, b: string, t: number): string => {
	const x = rgb(a);
	const y = rgb(b);
	if (!x || !y) return t < 0.5 ? a : b;
	const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
	return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

// ─────────────────────────── background ───────────────────────────

const CleanBackground: React.FC = () => {
	const frame = useCurrentFrame();
	const {colors} = useTheme();
	const {s} = useLayout();
	const t = frame / 30;
	const x1 = 25 + Math.sin(t * 0.35) * 15;
	const y1 = 20 + Math.cos(t * 0.27) * 10;
	const x2 = 75 + Math.cos(t * 0.3) * 15;
	const y2 = 75 + Math.sin(t * 0.22) * 12;
	return (
		<AbsoluteFill>
			<AbsoluteFill
				style={{
					background: [
						`radial-gradient(circle at ${x1}% ${y1}%, ${alpha(colors.accent2, 0.22)} 0%, transparent 45%)`,
						`radial-gradient(circle at ${x2}% ${y2}%, ${alpha(colors.accent3, 0.18)} 0%, transparent 42%)`,
						`linear-gradient(180deg, ${colors.bg2} 0%, ${colors.bg} 100%)`,
					].join(', '),
				}}
			/>
			<AbsoluteFill
				style={{
					backgroundImage: `radial-gradient(${alpha(colors.text, 0.07)} ${2 * s}px, transparent ${2.6 * s}px)`,
					backgroundSize: `${48 * s}px ${48 * s}px`,
					backgroundPosition: `0 ${-(frame * 0.4 * s) % (48 * s)}px`,
				}}
			/>
		</AbsoluteFill>
	);
};

const PixelBackground: React.FC = () => {
	const frame = useCurrentFrame();
	const {colors} = useTheme();
	const {s, width, height} = useLayout();
	// Hard-edged color bands instead of a smooth gradient, like 16-bit skies.
	const bands = 8;
	const stops = Array.from({length: bands}, (_, i) => {
		const c = mix(colors.bg2, colors.bg, i / (bands - 1));
		return `${c} ${(i / bands) * 100}% ${((i + 1) / bands) * 100}%`;
	});
	const block = 12 * s;
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{background: `linear-gradient(180deg, ${stops.join(', ')})`}} />
			<AbsoluteFill
				style={{
					backgroundImage: [
						`linear-gradient(${alpha(colors.text, 0.035)} ${2 * s}px, transparent ${2 * s}px)`,
						`linear-gradient(90deg, ${alpha(colors.text, 0.035)} ${2 * s}px, transparent ${2 * s}px)`,
					].join(', '),
					backgroundSize: `${72 * s}px ${72 * s}px`,
				}}
			/>
			{Array.from({length: 46}, (_, i) => {
				const x = Math.floor((random(`sx${i}`) * width) / block) * block;
				const y = Math.floor((random(`sy${i}`) * height) / block) * block;
				const size = block * (random(`ss${i}`) > 0.75 ? 2 : 1);
				const phase = Math.floor(random(`sp${i}`) * 40);
				const on = Math.floor((frame + phase) / 12) % 4 !== 0;
				const color = [colors.text, colors.accent, colors.accent2][i % 3];
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							width: size,
							height: size,
							background: color,
							opacity: on ? 0.55 : 0.12,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};

export const Background: React.FC = () => (useTheme().name === 'pixel' ? <PixelBackground /> : <CleanBackground />);

/** CRT scanlines + vignette on top of everything (pixel theme). */
export const Scanlines: React.FC = () => {
	const {s} = useLayout();
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill
				style={{
					backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) ${2 * s}px, transparent ${2 * s}px, transparent ${6 * s}px)`,
				}}
			/>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)'}} />
		</AbsoluteFill>
	);
};

// ─────────────────────────── progress bar ───────────────────────────

export const ProgressBar: React.FC = () => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const theme = useTheme();
	const {s, width} = useLayout();
	const p = Math.min(1, frame / Math.max(1, durationInFrames - 1));
	if (theme.name === 'pixel') {
		const segments = 24;
		const filled = Math.round(p * segments);
		const gap = 4 * s;
		const w = (width - gap * (segments + 1)) / segments;
		return (
			<div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 18 * s, display: 'flex', gap, padding: gap, background: 'rgba(0,0,0,0.5)'}}>
				{Array.from({length: segments}, (_, i) => (
					<div key={i} style={{width: w, height: '100%', background: i < filled ? theme.colors.accent : 'rgba(255,255,255,0.12)'}} />
				))}
			</div>
		);
	}
	return (
		<div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 10 * s, background: 'rgba(255,255,255,0.1)'}}>
			<div
				style={{
					width: `${p * 100}%`,
					height: '100%',
					background: `linear-gradient(90deg, ${theme.colors.accent2}, ${theme.colors.accent})`,
					borderRadius: `0 ${10 * s}px ${10 * s}px 0`,
				}}
			/>
		</div>
	);
};

// ─────────────────────────── captions ───────────────────────────

export const Captions: React.FC<{pages: CaptionPage[]}> = ({pages}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const theme = useTheme();
	const l = useLayout();
	const ms = (frame / fps) * 1000;
	const page = pages.find((p) => ms >= p.startMs - 40 && ms < p.endMs);
	if (!page) return null;

	const pageFrame = frame - Math.round((page.startMs * fps) / 1000);
	const pop = spring({frame: Math.max(0, pageFrame), fps, config: {damping: 16, stiffness: 220, mass: 0.6}});
	const pixel = theme.name === 'pixel';
	const fontSize = (pixel ? 96 : 70) * l.s;

	const words = page.words.map((w, i) => {
		const next = page.words[i + 1];
		const spoken = ms >= w.startMs - 40;
		const active = spoken && (next ? ms < next.startMs - 40 : ms < w.endMs + 250);
		return {...w, spoken, active};
	});

	if (pixel) {
		const done = words.every((w) => w.spoken) && Math.floor(frame / 8) % 2 === 0;
		return (
			<div style={{position: 'absolute', left: l.padX, right: l.padX, top: l.captionsTop, display: 'flex', justifyContent: 'center'}}>
				<div
					style={{
						position: 'relative',
						width: '100%',
						minHeight: fontSize * 2.1,
						background: 'rgba(0, 0, 0, 0.82)',
						border: `${5 * l.s}px solid ${theme.colors.text}`,
						boxShadow: `${8 * l.s}px ${8 * l.s}px 0 #000`,
						padding: `${18 * l.s}px ${30 * l.s}px`,
						fontFamily: theme.fonts.caption,
						fontSize,
						lineHeight: 1,
						color: theme.colors.text,
						display: 'flex',
						flexWrap: 'wrap',
						alignContent: 'center',
						columnGap: '0.35em',
					}}
				>
					{words.map((w, i) => (
						<span key={i} style={{visibility: w.spoken ? 'visible' : 'hidden', color: w.active ? theme.colors.accent : undefined}}>
							{w.text}
						</span>
					))}
					{done ? (
						<div
							style={{
								position: 'absolute',
								right: 22 * l.s,
								bottom: 16 * l.s,
								width: 0,
								height: 0,
								borderLeft: `${14 * l.s}px solid transparent`,
								borderRight: `${14 * l.s}px solid transparent`,
								borderTop: `${16 * l.s}px solid ${theme.colors.accent}`,
							}}
						/>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				position: 'absolute',
				left: l.padX,
				right: l.padX,
				top: l.captionsTop,
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'center',
				alignContent: 'flex-start',
				columnGap: '0.3em',
				rowGap: '0.1em',
				fontFamily: theme.fonts.caption,
				fontWeight: theme.fonts.captionWeight,
				fontSize,
				lineHeight: 1.15,
				color: theme.colors.text,
				transform: `scale(${0.85 + 0.15 * pop})`,
				opacity: Math.min(1, pop * 2),
			}}
		>
			{words.map((w, i) => (
				<span
					key={i}
					style={{
						padding: '0.02em 0.16em',
						borderRadius: '0.22em',
						background: w.active ? theme.colors.accent : 'transparent',
						color: w.active ? theme.colors.ink : theme.colors.text,
						opacity: w.spoken ? 1 : 0.55,
						textShadow: w.active ? 'none' : `0 ${3 * l.s}px ${12 * l.s}px rgba(0,0,0,0.8), 0 0 ${3 * l.s}px rgba(0,0,0,0.9)`,
						transform: w.active ? 'scale(1.06)' : undefined,
					}}
				>
					{w.text}
				</span>
			))}
		</div>
	);
};

// ─────────────────────────── pixel scene transitions ───────────────────────────

/** Blocks dissolve in and out around each scene change. */
export const PixelWipes: React.FC<{boundaries: number[]}> = ({boundaries}) => {
	const frame = useCurrentFrame();
	const theme = useTheme();
	const {s, width, height} = useLayout();
	const HALF = 6;
	const b = boundaries.find((x) => Math.abs(frame - x) <= HALF);
	if (b === undefined) return null;
	const coverage = 1 - Math.abs(frame - b) / (HALF + 1);
	const size = 120 * s;
	const cols = Math.ceil(width / size);
	const rows = Math.ceil(height / size);
	const blocks: React.ReactNode[] = [];
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const i = r * cols + c;
			if (random(`wipe-${b}-${i}`) < coverage) {
				blocks.push(
					<div
						key={i}
						style={{
							position: 'absolute',
							left: c * size,
							top: r * size,
							width: size + 1,
							height: size + 1,
							background: (r + c) % 2 ? theme.colors.bg2 : theme.colors.ink,
						}}
					/>,
				);
			}
		}
	}
	return <AbsoluteFill>{blocks}</AbsoluteFill>;
};

// ─────────────────────────── Studio-only debug overlay ───────────────────────────

export const DebugOverlay: React.FC<{episode: Episode; timeline: Timeline}> = ({episode, timeline}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const {s, vertical} = useLayout();
	if (!getRemotionEnvironment().isStudio) return null;
	const current = [...timeline.scenes].reverse().find((sc) => frame >= sc.startFrame);
	const scene = current ? episode.scenes[current.index] : null;
	const mode =
		timeline.mode === 'synced' ? `SYNCED (${timeline.source})` : 'ESTIMATED TIMING · no timing.json yet';
	return (
		<div
			style={{
				position: 'absolute',
				// Vertical: below the captions, where platform UI goes anyway. Otherwise top-right.
				...(vertical ? {left: 16 * s, bottom: 24 * s} : {right: 16 * s, top: 30 * s}),
				maxWidth: vertical ? '92%' : '45%',
				padding: `${10 * s}px ${14 * s}px`,
				background: 'rgba(0,0,0,0.78)',
				color: '#fff',
				fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
				fontSize: 22 * s,
				lineHeight: 1.35,
				borderRadius: 8 * s,
				pointerEvents: 'none',
			}}
		>
			<div style={{color: timeline.mode === 'synced' ? '#7CFF8A' : '#FFD23F'}}>{mode}</div>
			<div>
				{scene && current ? `Scene ${current.index + 1}/${episode.scenes.length} · ${scene.type}` : '—'} ·{' '}
				{(frame / fps).toFixed(2)}s
			</div>
			{timeline.warnings.map((w, i) => (
				<div key={i} style={{color: '#FF7B7B'}}>
					⚠ {w}
				</div>
			))}
			<div style={{opacity: 0.6}}>Studio only · hide it with debug: false in src/Root.tsx</div>
		</div>
	);
};
