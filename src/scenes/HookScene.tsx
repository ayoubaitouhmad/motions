import React from 'react';
import {ContentArea, useLayout} from '../components/layout';
import {Emoji, KineticText, Kicker} from '../components/primitives';
import {fitFontSize} from '../lib/text';
import {useTheme} from '../themes';
import type {HookScene as HookSceneType} from '../types';
import type {SceneProps} from './shared';

/** Big opening question, words flying in one by one. */
export const HookScene: React.FC<SceneProps<HookSceneType>> = ({scene}) => {
	const theme = useTheme();
	const l = useLayout();
	const pixel = theme.name === 'pixel';
	const fontSize = fitFontSize({
		text: scene.title,
		maxWidth: l.contentWidth * 0.96,
		maxSize: (pixel ? 96 : 140) * l.s,
		charEm: theme.fonts.titleCharEm,
		maxLines: 4,
	});
	const titleDelay = scene.kicker ? 8 : 4;
	return (
		<ContentArea gap={50}>
			{scene.emoji ? <Emoji char={scene.emoji} size={220 * l.s} /> : null}
			{scene.kicker ? <Kicker text={scene.kicker} delay={4} /> : null}
			<KineticText
				text={scene.title}
				delay={titleDelay}
				perWord={pixel ? 3 : 2}
				style={{
					fontFamily: theme.fonts.title,
					fontWeight: theme.fonts.titleWeight,
					fontSize,
					lineHeight: theme.fonts.titleLineHeight,
					textAlign: 'center',
					textShadow: theme.titleShadow(l.s),
					rowGap: pixel ? '0.25em' : '0.05em',
				}}
			/>
		</ContentArea>
	);
};
