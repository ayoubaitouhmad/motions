// Runs in the browser (Studio and render) before the video is drawn:
// loads the episode files, measures the voice and computes the timeline.
import {type CalculateMetadataFunction, staticFile} from 'remotion';
import type {Episode, ExplainerProps, FormatName, TimingFile} from '../types';
import {buildTimeline, DEFAULTS} from './timeline';

export const FORMATS: Record<FormatName, {width: number; height: number}> = {
	vertical: {width: 1080, height: 1920},
	square: {width: 1080, height: 1080},
	horizontal: {width: 1920, height: 1080},
};

const fetchJson = async <T,>(url: string): Promise<T | null> => {
	try {
		const res = await fetch(url, {cache: 'no-store'});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
};

/** Length of an audio file in ms, or null if it doesn't exist. */
const audioDurationMs = (src: string): Promise<number | null> =>
	new Promise((resolve) => {
		const audio = document.createElement('audio');
		const timer = setTimeout(() => resolve(null), 10000);
		audio.preload = 'metadata';
		audio.onloadedmetadata = () => {
			clearTimeout(timer);
			resolve(Number.isFinite(audio.duration) ? audio.duration * 1000 : null);
		};
		audio.onerror = () => {
			clearTimeout(timer);
			resolve(null);
		};
		audio.src = src;
	});

export const calculateMetadata: CalculateMetadataFunction<ExplainerProps> = async ({props}) => {
	const base = `episodes/${props.episodeId}`;
	const episode = await fetchJson<Episode>(staticFile(`${base}/episode.json`));
	if (!episode) {
		throw new Error(`Couldn't load public/${base}/episode.json. Check the file exists and is valid JSON.`);
	}
	if (!Array.isArray(episode.scenes)) {
		throw new Error(`public/${base}/episode.json needs a "scenes" array.`);
	}
	const fps = episode.fps ?? DEFAULTS.fps;
	const timing = await fetchJson<TimingFile>(staticFile(`${base}/timing.json`));
	const voiceSrc = staticFile(`${base}/${episode.voice?.file ?? 'voice.mp3'}`);
	const voiceMs = await audioDurationMs(voiceSrc);

	const timeline = buildTimeline({episode, timing, fps, audioMs: voiceMs});
	if (voiceMs && !timing) {
		timeline.warnings.unshift(
			`Voice found but no timing.json: run "npm run transcribe ${props.episodeId}" to sync it word by word.`,
		);
	}
	if (timing && !voiceMs) {
		timeline.warnings.unshift(`timing.json found but the voice file is missing (${episode.voice?.file ?? 'voice.mp3'}).`);
	}

	const {width, height} = FORMATS[episode.format ?? 'vertical'] ?? FORMATS.vertical;
	return {
		durationInFrames: timeline.durationInFrames,
		fps,
		width,
		height,
		props: {...props, episode, timeline, audioSrc: voiceMs ? voiceSrc : null},
	};
};
