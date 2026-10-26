import React from 'react';
import {interpolate} from 'remotion';
import {ContentArea, useLayout} from '../components/layout';
import {Card, Kicker, Pop, Rich, useStepFrame} from '../components/primitives';
import {fitFontSize} from '../lib/text';
import {useTheme} from '../themes';
import type {DefinitionScene as DefinitionSceneType} from '../types';
import {type SceneProps, useBodySize} from './shared';

/** A key term typed out, then its definition when the voice explains it. */
export const DefinitionScene: React.FC<SceneProps<DefinitionSceneType>> = ({scene, timing}) => {
	const theme = useTheme();
	const l = useLayout();
	const frame = useStepFrame();
	const pixel = theme.name === 'pixel';
	const TYPE_START = 6;
	const chars = [...scene.term];
	const typed = Math.floor(
		interpolate(frame, [TYPE_START, TYPE_START + chars.length * 1.6], [0, chars.length], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}),
	);
	const typing = typed < chars.length;
	const cursorOn = typing || Math.floor(frame / 10) % 2 === 0;
	const termSize = fitFontSize({
		text: scene.term,
		maxWidth: l.contentWidth * 0.92,
		maxSize: (pixel ? 76 : 120) * l.s,
		charEm: theme.fonts.titleCharEm,
		maxLines: 2,
	});
	const underline = interpolate(frame, [TYPE_START + chars.length * 1.6, TYPE_START + chars.length * 1.6 + 12], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const definitionAt = timing.cues.definition ?? 30;
	const bodySize = useBodySize(54);

	return (
		<ContentArea gap={44}>
			{scene.kicker ? <Kicker text={scene.kicker} delay={2} color={theme.colors.accent3} /> : null}
			<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 * l.s}}>
				<div
					style={{
						fontFamily: theme.fonts.title,
						fontWeight: theme.fonts.titleWeight,
						fontSize: termSize,
						lineHeight: theme.fonts.titleLineHeight,
						textAlign: 'center',
						textShadow: theme.titleShadow(l.s),
						color: theme.colors.accent,
					}}
				>
					{/* The untyped rest stays invisible so the layout doesn't jump while typing. */}
					<span>{chars.slice(0, typed).join('')}</span>
					<span
						style={{
							display: 'inline-block',
							width: '0.5em',
							height: '0.85em',
							marginLeft: '0.06em',
							marginRight: '-0.56em',
							background: cursorOn ? theme.colors.text : 'transparent',
							transform: 'translateY(0.1em)',
						}}
					/>
					<span style={{visibility: 'hidden'}}>{chars.slice(typed).join('')}</span>
				</div>
				<div
					style={{
						width: `${underline * 70}%`,
						height: 10 * l.s,
						background: theme.colors.accent,
						borderRadius: pixel ? 0 : 999,
						boxShadow: pixel ? `${5 * l.s}px ${5 * l.s}px 0 #000` : undefined,
					}}
				/>
			</div>
			<Pop delay={definitionAt} from="up">
				<Card>
					<div
						style={{
							fontFamily: theme.fonts.body,
							fontWeight: theme.fonts.bodyWeight,
							fontSize: bodySize,
							lineHeight: theme.fonts.bodyLineHeight,
							textAlign: 'center',
						}}
					>
						<Rich text={scene.definition} />
					</div>
				</Card>
			</Pop>
		</ContentArea>
	);
};
