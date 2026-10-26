import {Audio} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Captions, DebugOverlay, PixelWipes, ProgressBar, Scanlines} from './components/chrome';
import {LayoutProvider} from './components/layout';
import {SceneFrame} from './components/primitives';
import {SceneView} from './scenes';
import {getTheme, ThemeContext} from './themes';
import type {ExplainerProps} from './types';

const Music: React.FC<{src: string; volume: number}> = ({src, volume}) => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	const v = interpolate(
		frame,
		[0, fps, durationInFrames - fps * 1.5, durationInFrames],
		[0, volume, volume, 0],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);
	return <Audio src={src} volume={v} loop />;
};

export const Explainer: React.FC<ExplainerProps> = ({episodeId, episode, timeline, audioSrc, debug = true}) => {
	if (!episode || !timeline) {
		return <AbsoluteFill style={{background: '#000'}} />;
	}
	const theme = getTheme(episode);
	const showCaptions = episode.captions !== false;
	const assetBase = `episodes/${episodeId}`;
	const boundaries = timeline.scenes.slice(1).map((s) => s.startFrame);

	return (
		<ThemeContext.Provider value={theme}>
			<LayoutProvider captions={showCaptions} assetBase={assetBase}>
				<AbsoluteFill
					style={{
						backgroundColor: theme.colors.bg,
						color: theme.colors.text,
						fontFamily: theme.fonts.body,
						overflow: 'hidden',
					}}
				>
					<Background />
					{timeline.scenes.map((t) => {
						const scene = episode.scenes[t.index];
						return (
							<Sequence
								key={t.index}
								from={t.startFrame}
								durationInFrames={t.durationInFrames}
								name={`${t.index + 1} · ${scene.type}`}
							>
								<SceneFrame durationInFrames={t.durationInFrames}>
									<SceneView scene={scene} timing={t} />
								</SceneFrame>
							</Sequence>
						);
					})}
					{theme.name === 'pixel' ? <PixelWipes boundaries={boundaries} /> : null}
					{showCaptions ? <Captions pages={timeline.captions} /> : null}
					<ProgressBar />
					{theme.name === 'pixel' ? <Scanlines /> : null}
					{audioSrc ? <Audio src={audioSrc} volume={episode.voice?.volume ?? 1} /> : null}
					{episode.music ? (
						<Music src={staticFile(`${assetBase}/${episode.music.file}`)} volume={episode.music.volume ?? 0.08} />
					) : null}
					{debug ? <DebugOverlay episode={episode} timeline={timeline} /> : null}
				</AbsoluteFill>
			</LayoutProvider>
		</ThemeContext.Provider>
	);
};
