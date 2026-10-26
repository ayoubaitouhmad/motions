import React from 'react';
import {ContentArea, useLayout} from '../components/layout';
import {Card, EMOJI_FONT, Pop, Rich, useStepFrame} from '../components/primitives';
import {useTheme} from '../themes';
import type {BulletsScene as BulletsSceneType} from '../types';
import {type SceneProps, SceneTitle, useBodySize} from './shared';

/** A title and a list. Each item appears when the voice says its `at` phrase. */
export const BulletsScene: React.FC<SceneProps<BulletsSceneType>> = ({scene, timing}) => {
	const theme = useTheme();
	const l = useLayout();
	const frame = useStepFrame();
	const pixel = theme.name === 'pixel';
	const textSize = useBodySize(scene.items.length > 3 ? 50 : 56);
	const badge = (pixel ? 92 : 104) * l.s;
	const cues = scene.items.map((_, i) => timing.cues[`item-${i}`] ?? 0);
	// The most recently revealed item is highlighted.
	const active = cues.reduce((acc, c, i) => (frame >= c ? i : acc), -1);

	return (
		<ContentArea gap={34}>
			{scene.title ? <SceneTitle text={scene.title} delay={2} /> : null}
			<div style={{display: 'flex', flexDirection: 'column', gap: 26 * l.s, marginTop: 10 * l.s}}>
				{scene.items.map((item, i) => {
					const isActive = i === active;
					const colors = [theme.colors.accent2, theme.colors.accent3, theme.colors.accent];
					const tint = colors[i % colors.length];
					return (
						<Pop key={i} delay={cues[i]} from="left">
							<Card
								highlight={isActive ? theme.colors.accent : undefined}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 30 * l.s,
									opacity: frame >= cues[i] && !isActive ? 0.72 : 1,
									transform: isActive && !pixel ? `scale(1.02)` : undefined,
								}}
							>
								<div
									style={{
										flex: 'none',
										width: badge,
										height: badge,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										borderRadius: pixel ? 0 : badge / 3,
										background: item.emoji ? 'transparent' : tint,
										color: theme.colors.ink,
										fontFamily: item.emoji ? EMOJI_FONT : theme.fonts.title,
										fontWeight: theme.fonts.titleWeight,
										fontSize: item.emoji ? badge * 0.78 : badge * (pixel ? 0.42 : 0.5),
										boxShadow: !item.emoji && pixel ? `${5 * l.s}px ${5 * l.s}px 0 #000` : undefined,
									}}
								>
									{item.emoji ?? (scene.numbered === false ? '•' : i + 1)}
								</div>
								<div
									style={{
										fontFamily: theme.fonts.body,
										fontWeight: theme.fonts.bodyWeight,
										fontSize: textSize,
										lineHeight: theme.fonts.bodyLineHeight,
									}}
								>
									<Rich text={item.text} />
								</div>
							</Card>
						</Pop>
					);
				})}
			</div>
		</ContentArea>
	);
};
