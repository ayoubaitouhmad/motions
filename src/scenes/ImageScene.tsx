import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ContentArea, useLayout} from '../components/layout';
import {Card, Pop, Rich} from '../components/primitives';
import {useTheme} from '../themes';
import type {ImageScene as ImageSceneType} from '../types';
import {type SceneProps, SceneTitle, useBodySize} from './shared';

/** An image from the episode folder with a slow Ken Burns zoom. */
export const ImageScene: React.FC<SceneProps<ImageSceneType>> = ({scene, timing}) => {
	const theme = useTheme();
	const l = useLayout();
	const frame = useCurrentFrame();
	const zoom = scene.zoom ?? 'in';
	const range: [number, number] = zoom === 'in' ? [1, 1.12] : zoom === 'out' ? [1.12, 1] : [1, 1];
	const scale = interpolate(frame, [0, timing.durationInFrames], range, {extrapolateRight: 'clamp'});
	const captionSize = useBodySize(46);
	const pixel = theme.name === 'pixel';
	return (
		<ContentArea gap={34}>
			{scene.title ? <SceneTitle text={scene.title} delay={2} /> : null}
			<Pop delay={4} from="scale" style={{flex: 1, minHeight: 0, display: 'flex'}}>
				<Card style={{flex: 1, padding: 0, overflow: 'hidden', display: 'flex'}}>
					<Img
						src={staticFile(`${l.assetBase}/${scene.src}`)}
						style={{
							width: '100%',
							height: '100%',
							objectFit: 'cover',
							transform: `scale(${scale})`,
							imageRendering: pixel ? 'pixelated' : undefined,
						}}
					/>
				</Card>
			</Pop>
			{scene.caption ? (
				<Pop delay={12} from="up">
					<div
						style={{
							fontFamily: theme.fonts.body,
							fontWeight: theme.fonts.bodyWeight,
							fontSize: captionSize,
							textAlign: 'center',
							color: theme.colors.muted,
						}}
					>
						<Rich text={scene.caption} />
					</div>
				</Pop>
			) : null}
		</ContentArea>
	);
};
