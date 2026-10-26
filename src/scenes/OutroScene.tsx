import React from 'react';
import {ContentArea, useLayout} from '../components/layout';
import {Emoji, KineticText, Pop, Rich, useStepFrame} from '../components/primitives';
import {fitFontSize, plain} from '../lib/text';
import {useTheme} from '../themes';
import type {OutroScene as OutroSceneType} from '../types';
import {type SceneProps, useBodySize} from './shared';

/** Call to action: title, subtitle, a pulsing subscribe button and the channel handle. */
export const OutroScene: React.FC<SceneProps<OutroSceneType>> = ({scene}) => {
	const theme = useTheme();
	const l = useLayout();
	const frame = useStepFrame();
	const pixel = theme.name === 'pixel';
	const titleSize = fitFontSize({
		text: scene.title,
		maxWidth: l.contentWidth * 0.95,
		maxSize: (pixel ? 92 : 140) * l.s,
		charEm: theme.fonts.titleCharEm,
		maxLines: 2,
	});
	const subSize = useBodySize(54);
	const pulse = pixel ? (Math.floor(frame / 9) % 2 ? 1.06 : 1) : 1 + Math.sin(frame / 6) * 0.04;
	const buttonSize = (pixel ? 38 : 48) * l.s;
	return (
		<ContentArea gap={46}>
			{scene.emoji ? <Emoji char={scene.emoji} size={200 * l.s} /> : null}
			<KineticText
				text={scene.title}
				delay={4}
				style={{
					fontFamily: theme.fonts.title,
					fontWeight: theme.fonts.titleWeight,
					fontSize: titleSize,
					lineHeight: theme.fonts.titleLineHeight,
					textAlign: 'center',
					textShadow: theme.titleShadow(l.s),
				}}
			/>
			{scene.subtitle ? (
				<Pop delay={10}>
					<div
						style={{
							fontFamily: theme.fonts.body,
							fontWeight: theme.fonts.bodyWeight,
							fontSize: subSize,
							textAlign: 'center',
							color: theme.colors.muted,
						}}
					>
						<Rich text={scene.subtitle} />
					</div>
				</Pop>
			) : null}
			{scene.button ? (
				<Pop delay={16} from="scale">
					<div style={{display: 'flex', justifyContent: 'center'}}>
						<div
							style={{
								transform: `scale(${pulse})`,
								background: theme.colors.accent3,
								color: '#FFFFFF',
								fontFamily: theme.fonts.title,
								fontWeight: theme.fonts.titleWeight,
								fontSize: buttonSize,
								padding: `${buttonSize * 0.55}px ${buttonSize * 1.1}px`,
								borderRadius: pixel ? 0 : 999,
								boxShadow: pixel ? `${8 * l.s}px ${8 * l.s}px 0 #000` : `0 ${14 * l.s}px ${40 * l.s}px rgba(0,0,0,0.4)`,
								border: pixel ? `${5 * l.s}px solid ${theme.colors.text}` : undefined,
								whiteSpace: 'nowrap',
							}}
						>
							{plain(scene.button)}
						</div>
					</div>
				</Pop>
			) : null}
			{scene.handle ? (
				<Pop delay={22}>
					<div
						style={{
							fontFamily: theme.fonts.body,
							fontWeight: theme.fonts.bodyWeight,
							fontSize: subSize * 0.85,
							textAlign: 'center',
							color: theme.colors.text,
							opacity: 0.85,
						}}
					>
						{scene.handle}
					</div>
				</Pop>
			) : null}
		</ContentArea>
	);
};
