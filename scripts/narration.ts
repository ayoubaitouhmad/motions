// npm run narration <id>
// Prints the full voice-over script and saves it to narration.txt,
// ready to paste into ElevenLabs (or to read when recording yourself).
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {narrationText} from '../src/lib/timeline';
import {episodeDir, loadEpisode, parseArgs, requireId} from './_lib';

const id = requireId(parseArgs(), 'npm run narration <id>');
const episode = loadEpisode(id);
const text = narrationText(episode);
const file = path.join(episodeDir(id), 'narration.txt');
writeFileSync(file, `${text}\n`);

const words = text.split(/\s+/).filter(Boolean).length;
console.log(`\n${text}\n`);
console.log(`— ${words} words · ${text.length} characters · ~${Math.round(words / (episode.speechRate ?? 2.6))} s spoken`);
console.log(`— Saved to public/episodes/${id}/narration.txt\n`);
