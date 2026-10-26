import React from 'react';
import {Composition} from 'remotion';
import {EPISODES} from './episodes';
import {Explainer} from './Explainer';
import {calculateMetadata} from './lib/load-episode';

export const RemotionRoot: React.FC = () => (
	<>
		{EPISODES.map((id) => (
			<Composition
				key={id}
				id={id}
				component={Explainer}
				// Real size, fps and duration come from the episode in calculateMetadata.
				width={1080}
				height={1920}
				fps={30}
				durationInFrames={300}
				defaultProps={{episodeId: id, debug: true}}
				calculateMetadata={calculateMetadata}
			/>
		))}
	</>
);
