// npm run timeline <id>
// Prints when each scene and cue happens, plus any sync warnings.
import {parseArgs, printTimeline, requireId} from './_lib';

printTimeline(requireId(parseArgs(), 'npm run timeline <id>'));
