import React from 'react';
import {Pop, Rich} from '../components/primitives';
import {useLayout} from '../components/layout';
import {fitFontSize} from '../lib/text';
import {useTheme} from '../themes';
import type {SceneTiming} from '../types';

export type SceneProps<T> = {scene: T; timing: SceneTiming};

/** A title that always fits the width (long French words included). */
export const SceneTitle: React.FC<{
	text: string;
	delay?: number;
	max?: number;
	maxLines?: number;
	align?: 'center' | 'left';
}> = ({text, delay = 0, max, maxLines = 2, align = 'center'}) => {
	const theme = useTheme();
	const l = useLayout();
	const pixel = theme.name === 'pixel';
	const maxSize = (max ?? (pixel ? 72 : 104)) * l.s;
	const fontSize = fitFontSize({
		text,
		maxWidth: l.contentWidth * 0.96,
		maxSize,
		charEm: theme.fonts.titleCharEm,
		maxLines,
	});
	return (
		<Pop delay={delay} from="down">
			<div
				style={{
					fontFamily: theme.fonts.title,
					fontWeight: theme.fonts.titleWeight,
					fontSize,
					lineHeight: theme.fonts.titleLineHeight,
					textAlign: align,
					textShadow: theme.titleShadow(l.s),
				}}
			>
				<Rich text={text} />
			</div>
		</Pop>
	);
};

/** Body text size, adjusted for pixel fonts. */
export const useBodySize = (base: number): number => {
	const theme = useTheme();
	const {s} = useLayout();
	return base * s * theme.fonts.bodyScale;
};
