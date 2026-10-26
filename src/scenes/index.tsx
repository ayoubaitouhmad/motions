import React from 'react';
import type {Scene, SceneTiming} from '../types';
import {BulletsScene} from './BulletsScene';
import {CompareScene} from './CompareScene';
import {DefinitionScene} from './DefinitionScene';
import {HookScene} from './HookScene';
import {ImageScene} from './ImageScene';
import {OutroScene} from './OutroScene';
import {StatScene} from './StatScene';

/** Picks the component for a scene `type`. Add new scene types here. */
export const SceneView: React.FC<{scene: Scene; timing: SceneTiming}> = ({scene, timing}) => {
	switch (scene.type) {
		case 'hook':
			return <HookScene scene={scene} timing={timing} />;
		case 'bullets':
			return <BulletsScene scene={scene} timing={timing} />;
		case 'stat':
			return <StatScene scene={scene} timing={timing} />;
		case 'compare':
			return <CompareScene scene={scene} timing={timing} />;
		case 'definition':
			return <DefinitionScene scene={scene} timing={timing} />;
		case 'image':
			return <ImageScene scene={scene} timing={timing} />;
		case 'outro':
			return <OutroScene scene={scene} timing={timing} />;
		default: {
			const unknown = scene as {type?: string};
			throw new Error(`Unknown scene type "${unknown.type}". Use: hook, bullets, stat, compare, definition, image, outro.`);
		}
	}
};
