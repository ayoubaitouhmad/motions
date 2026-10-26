// Helpers shared by the CLI scripts (Node only).
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {buildTimeline, describeTimeline} from '../src/lib/timeline';
import type {Episode, TimingFile} from '../src/types';

export const ROOT = process.cwd();
export const episodeDir = (id: string) => path.join(ROOT, 'public', 'episodes', id);

/** Minimal flag parser: `demo --voice abc --draft` -> {_: ['demo'], voice: 'abc', draft: true} */
export const parseArgs = (argv = process.argv.slice(2)) => {
	const out: {_: string[]; [k: string]: string | boolean | string[]} = {_: []};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith('--')) {
			const [k, inline] = a.slice(2).split('=');
			const next = argv[i + 1];
			if (inline !== undefined) out[k] = inline;
			else if (next && !next.startsWith('--')) {
				out[k] = next;
				i++;
			} else out[k] = true;
		} else out._.push(a);
	}
	return out;
};

export const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/**
 * Read a --flag. Works with `npm run x -- --flag value` and also with
 * `npm run x --flag value` (npm then passes it as npm_config_flag).
 */
export const flag = (args: ReturnType<typeof parseArgs>, name: string): string | boolean | undefined => {
	const v = args[name];
	if (v !== undefined && !Array.isArray(v)) return v;
	const env = process.env[`npm_config_${name}`];
	if (env === undefined || env === '') return undefined;
	return env === 'true' ? true : env;
};

export const fail = (msg: string): never => {
	console.error(`\n✖ ${msg}\n`);
	process.exit(1);
};

export const requireId = (args: ReturnType<typeof parseArgs>, usage: string): string => {
	const id = args._[0];
	if (!id) fail(`Missing episode id.\n  Usage: ${usage}`);
	if (!existsSync(path.join(episodeDir(id), 'episode.json'))) {
		fail(`No episode "${id}". Expected public/episodes/${id}/episode.json\n  Create one with: npm run new ${id}`);
	}
	return id;
};

export const loadEpisode = (id: string): Episode => {
	const file = path.join(episodeDir(id), 'episode.json');
	try {
		return JSON.parse(readFileSync(file, 'utf8')) as Episode;
	} catch (e) {
		return fail(`public/episodes/${id}/episode.json is not valid JSON: ${(e as Error).message}`);
	}
};

export const loadTiming = (id: string): TimingFile | null => {
	const file = path.join(episodeDir(id), 'timing.json');
	return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as TimingFile) : null;
};

/** Reads KEY=value lines from .env into process.env (no dependency needed). */
export const loadDotEnv = () => {
	const file = path.join(ROOT, '.env');
	if (!existsSync(file)) return;
	for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
		const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
	}
};

const quoteWin = (a: string) => (/[\s"&|<>^()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

/** Run a command and stream its output. On Windows, npx needs a shell. */
export const run = (cmd: string, args: string[], opts: {quiet?: boolean} = {}): {ok: boolean; stdout: string} => {
	const win = process.platform === 'win32';
	const res = spawnSync(cmd, win ? args.map(quoteWin) : args, {
		cwd: ROOT,
		shell: win,
		stdio: opts.quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
		encoding: 'utf8',
	});
	return {ok: res.status === 0, stdout: (res.stdout as string | null) ?? ''};
};

/** Audio length in ms using the ffprobe that ships with Remotion. */
export const probeDurationMs = (file: string): number | null => {
	const res = run('npx', ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
		quiet: true,
	});
	const sec = parseFloat(res.stdout.trim());
	return res.ok && Number.isFinite(sec) ? Math.round(sec * 1000) : null;
};

/** Print the scene timings and any warnings. Returns the warning count. */
export const printTimeline = (id: string, audioMs: number | null = null): number => {
	const episode = loadEpisode(id);
	const timing = loadTiming(id);
	const fps = episode.fps ?? 30;
	const tl = buildTimeline({episode, timing, fps, audioMs});
	console.log(`\n${episode.title}  ·  ${(tl.durationInFrames / fps).toFixed(1)} s  ·  ${tl.mode === 'synced' ? `synced (${tl.source})` : 'estimated timing (no timing.json)'}`);
	for (const line of describeTimeline(episode, tl, fps)) console.log(`  ${line}`);
	for (const w of tl.warnings) console.log(`  ⚠ ${w}`);
	console.log('');
	return tl.warnings.length;
};
