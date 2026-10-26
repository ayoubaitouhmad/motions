import React from 'react';
import {ContentArea, useLayout} from '../components/layout';
import {Card, EMOJI_FONT, Pop, Rich, useEnter} from '../components/primitives';
import {useTheme} from '../themes';
import type {CompareScene as CompareSceneType, CompareSide} from '../types';
import {type SceneProps, SceneTitle, useBodySize} from './shared';

const Side: React.FC<{side: CompareSide; color: string; delay: number; from: 'left' | 'right'}> = ({
	side,
	color,
	delay,
	from,
}) => {
	const theme = useTheme();
	const l = useLayout();
	const labelSize = (theme.name === 'pixel' ? 46 : 66) * l.s;
	const textSize = useBodySize(48);
	return (
		<Pop delay={delay} from={from} style={l.vertical ? undefined : {flex: 1, display: 'flex'}}>
			<Card highlight={color} style={{display: 'flex', alignItems: 'center', gap: 32 * l.s, flex: 1}}>
				{side.emoji ? (
					<div style={{fontFamily: EMOJI_FONT, fontSize: 130 * l.s, lineHeight: 1, flex: 'none'}}>{side.emoji}</div>
				) : null}
				<div style={{display: 'flex', flexDirection: 'column', gap: 14 * l.s}}>
					<div
						style={{
							fontFamily: theme.fonts.title,
							fontWeight: theme.fonts.titleWeight,
							fontSize: labelSize,
							lineHeight: 1.1,
							color,
						}}
					>
						{side.label}
					</div>
					{side.text ? (
						<div
							style={{
								fontFamily: theme.fonts.body,
								fontWeight: theme.fonts.bodyWeight,
								fontSize: textSize,
								lineHeight: theme.fonts.bodyLineHeight,
							}}
						>
							<Rich text={side.text} />
						</div>
					) : null}
				</div>
			</Card>
		</Pop>
	);
};

/** Two options side by side (stacked on vertical video) with a VS badge. */
export const CompareScene: React.FC<SceneProps<CompareSceneType>> = ({scene, timing}) => {
	const theme = useTheme();
	const l = useLayout();
	const left = timing.cues.left ?? 0;
	const right = timing.cues.right ?? 0;
	const vs = useEnter(right);
	const pixel = theme.name === 'pixel';
	const vsSize = (pixel ? 110 : 120) * l.s;
	return (
		<ContentArea gap={36}>
			{scene.title ? <SceneTitle text={scene.title} delay={2} /> : null}
			<div
				style={{
					display: 'flex',
					flexDirection: l.vertical ? 'column' : 'row',
					alignItems: 'stretch',
				}}
			>
				<Side side={scene.left} color={theme.colors.accent2} delay={left} from="left" />
				{/* The VS badge sits in the gap between the two cards, overlapping their borders a little. */}
				<div
					style={{
						alignSelf: 'center',
						flex: 'none',
						width: vsSize,
						height: vsSize,
						margin: l.vertical ? `${-vsSize * 0.22}px 0` : `0 ${-vsSize * 0.22}px`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: pixel ? 0 : '50%',
						background: theme.colors.accent,
						color: theme.colors.ink,
						fontFamily: theme.fonts.title,
						fontWeight: theme.fonts.titleWeight,
						fontSize: vsSize * (pixel ? 0.3 : 0.36),
						boxShadow: pixel ? `${8 * l.s}px ${8 * l.s}px 0 #000` : `0 0 0 ${10 * l.s}px ${theme.colors.bg}`,
						transform: `scale(${vs}) rotate(${(1 - vs) * 180}deg)`,
						position: 'relative',
						zIndex: 2,
					}}
				>
					VS
				</div>
				<Side side={scene.right} color={theme.colors.accent3} delay={right} from="right" />
			</div>
		</ContentArea>
	);
};
