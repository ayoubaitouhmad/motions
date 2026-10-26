import React from 'react';
import {Easing, interpolate} from 'remotion';
import {ContentArea, useLayout} from '../components/layout';
import {Kicker, Pop, Rich, useStepFrame} from '../components/primitives';
import {fitFontSize, formatNumber} from '../lib/text';
import {useTheme} from '../themes';
import type {StatScene as StatSceneType} from '../types';
import {type SceneProps, useBodySize} from './shared';

/** A big number that counts up when the voice says it. */
export const StatScene: React.FC<SceneProps<StatSceneType>> = ({scene, timing}) => {
	const theme = useTheme();
	const l = useLayout();
	const frame = useStepFrame();
	const pixel = theme.name === 'pixel';
	const countAt = timing.cues.count ?? 6;
	const COUNT_FRAMES = 30;
	const p = interpolate(frame, [countAt, countAt + COUNT_FRAMES], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.cubic),
	});
	const decimals = scene.decimals ?? 0;
	const shown = formatNumber(scene.value * p, decimals);
	const full = `${scene.prefix ?? ''}${formatNumber(scene.value, decimals)}${scene.suffix ?? ''}`;
	const numberSize = fitFontSize({
		text: full.replace(/\s/g, '0'),
		maxWidth: l.contentWidth * 0.95,
		maxSize: (pixel ? 220 : 300) * l.s,
		charEm: pixel ? 1 : 0.68,
		maxLines: 1,
	});
	const landed = frame >= countAt + COUNT_FRAMES;
	const punch = landed ? interpolate(frame - countAt - COUNT_FRAMES, [0, 4, 10], [1.12, 1.12, 1], {extrapolateRight: 'clamp'}) : 1;
	const labelSize = useBodySize(58);

	return (
		<ContentArea gap={46}>
			{scene.kicker ? <Kicker text={scene.kicker} delay={2} color={theme.colors.accent2} /> : null}
			<Pop delay={countAt > 4 ? 2 : 0} from="scale">
				<div
					style={{
						display: 'flex',
						alignItems: 'baseline',
						justifyContent: 'center',
						fontFamily: theme.fonts.title,
						fontWeight: theme.fonts.titleWeight,
						fontSize: numberSize,
						lineHeight: 1,
						color: theme.colors.accent,
						fontVariantNumeric: 'tabular-nums',
						textShadow: theme.titleShadow(l.s * 1.6),
						transform: `scale(${punch})`,
						whiteSpace: 'nowrap',
					}}
				>
					{scene.prefix ? <span style={{fontSize: '0.6em', marginRight: '0.08em'}}>{scene.prefix}</span> : null}
					<span>{shown}</span>
					{scene.suffix ? <span style={{fontSize: '0.5em', marginLeft: '0.08em'}}>{scene.suffix}</span> : null}
				</div>
			</Pop>
			{scene.bar ? (
				<div
					style={{
						height: 36 * l.s,
						border: `${Math.max(2, theme.border * l.s)}px solid ${theme.colors.cardBorder}`,
						borderRadius: pixel ? 0 : 999,
						background: theme.colors.card,
						overflow: 'hidden',
						boxShadow: theme.cardShadow(l.s * 0.6),
					}}
				>
					<div
						style={{
							width: `${Math.max(0, Math.min(100, scene.value * p))}%`,
							height: '100%',
							background: theme.colors.accent,
						}}
					/>
				</div>
			) : null}
			<Pop delay={countAt + 8} from="up">
				<div
					style={{
						fontFamily: theme.fonts.body,
						fontWeight: theme.fonts.bodyWeight,
						fontSize: labelSize,
						lineHeight: theme.fonts.bodyLineHeight,
						textAlign: 'center',
						color: theme.colors.text,
					}}
				>
					<Rich text={scene.label} color={theme.colors.accent2} />
				</div>
			</Pop>
		</ContentArea>
	);
};
