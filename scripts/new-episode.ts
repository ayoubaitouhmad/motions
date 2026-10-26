// npm run new <id> [--title "Mon titre"] [--theme clean|pixel] [--format vertical|square|horizontal]
// Creates public/episodes/<id>/episode.json from a template and registers it in src/episodes.ts.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {slugify} from '../src/lib/text';
import type {Episode} from '../src/types';
import {episodeDir, fail, flag, parseArgs, ROOT, str} from './_lib';

const args = parseArgs();
const raw = args._[0];
if (!raw) fail('Usage: npm run new <id> [--title "Mon titre"] [--theme clean|pixel] [--format vertical]');
const id = slugify(raw);
if (!id) fail(`"${raw}" isn't a usable id. Use letters, numbers and dashes.`);

const dir = episodeDir(id);
if (existsSync(path.join(dir, 'episode.json'))) fail(`public/episodes/${id}/episode.json already exists.`);

const theme = str(flag(args, 'theme')) === 'pixel' ? 'pixel' : 'clean';
const format = (['vertical', 'square', 'horizontal'] as const).find((f) => f === str(flag(args, 'format'))) ?? 'vertical';
const title = str(flag(args, 'title')) ?? 'Ton titre ici ?';

const episode: Episode = {
	title,
	theme,
	format,
	fps: 30,
	voice: {file: 'voice.mp3', voiceId: '', model: 'eleven_multilingual_v2'},
	captions: true,
	scenes: [
		{
			type: 'hook',
			kicker: 'LE SAVIEZ-VOUS ?',
			emoji: '🤔',
			title: `${title.replace(/\?$/, '').trim()} **?**`,
			say: 'Écris ici la question qui accroche dès la première seconde.',
		},
		{
			type: 'bullets',
			title: 'Les **3** points clés',
			say: "Premier point, l'idée principale. Deuxième point, un exemple concret. Troisième point, ce qu'il faut retenir.",
			items: [
				{text: "L'idée **principale**", at: 'premier point'},
				{text: 'Un exemple concret', at: 'deuxième point'},
				{text: 'Ce qu’il faut **retenir**', at: 'troisième point'},
			],
		},
		{
			type: 'stat',
			kicker: 'LE CHIFFRE',
			value: 42,
			suffix: '%',
			bar: true,
			label: 'des gens ne le savent **pas**',
			countAt: 'quarante-deux',
			say: 'Et pourtant, quarante-deux pour cent des gens ne le savent pas.',
		},
		{
			type: 'outro',
			emoji: '🚀',
			title: 'Abonne-toi !',
			subtitle: 'Une idée claire en **1 minute**',
			button: "S'ABONNER",
			handle: '@ta_chaine',
			say: 'Abonne-toi pour la suite !',
		},
	],
};

mkdirSync(dir, {recursive: true});
writeFileSync(path.join(dir, 'episode.json'), `${JSON.stringify(episode, null, 2)}\n`);

// Register the episode so it appears in the Studio.
const registry = path.join(ROOT, 'src', 'episodes.ts');
const src = readFileSync(registry, 'utf8');
const m = /export const EPISODES: string\[\] = \[([^\]]*)\];/.exec(src);
if (!m) fail('Could not find the EPISODES array in src/episodes.ts. Add the id by hand.');
const ids = m![1]
	.split(',')
	.map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
	.filter(Boolean);
if (!ids.includes(id)) ids.push(id);
writeFileSync(registry, src.replace(m![0], `export const EPISODES: string[] = [${ids.map((x) => `'${x}'`).join(', ')}];`));

console.log(`
✔ Created public/episodes/${id}/episode.json (${theme}, ${format})

Next:
  1. Write the script in episode.json (each scene's "say")
  2. npm run studio            preview with estimated timing
  3. npm run voice ${id}       generate the voice with ElevenLabs
     or put your own voice.mp3 in the folder and run: npm run transcribe ${id}
  4. npm run render ${id}
`);
