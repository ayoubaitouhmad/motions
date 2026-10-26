// npm run render <id> [--draft] [--out out/my-video.mp4]
// Renders the episode to an MP4 on your machine. --draft renders at half size, faster.
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {fail, flag, parseArgs, printTimeline, requireId, ROOT, run, str} from './_lib';

const args = parseArgs();
const id = requireId(args, 'npm run render <id> [--draft] [--out out/<id>.mp4]');
const draft = flag(args, 'draft') === true;
const out = str(flag(args, 'out')) ?? path.join('out', `${id}${draft ? '-draft' : ''}.mp4`);
mkdirSync(path.dirname(path.join(ROOT, out)), {recursive: true});

printTimeline(id);

const flags = ['remotion', 'render', 'src/index.ts', id, out];
if (draft) flags.push('--scale=0.5');
const res = run('npx', flags);
if (!res.ok) fail('Render failed (see the error above).');
console.log(`\n✔ ${out}\n`);
