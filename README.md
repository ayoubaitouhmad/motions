# motions

Short motion-graphics explainer videos, synced word by word to a voice-over.
You write the script in a JSON file; the video is built with [Remotion](https://www.remotion.dev) (React) and rendered on your own machine.

- **Two looks:** `clean` (modern flat explainer) and `pixel` (retro pixel art, RPG dialog boxes, motion on threes)
- **7 scene types:** hook, bullets, stat, compare, definition, image, outro
- **Voice sync:** every element appears when the voice says its phrase, from ElevenLabs timestamps or a local Whisper transcription
- **Captions:** word-by-word subtitles that use your script's spelling, not the transcription's
- **Formats:** vertical 9:16 (default), square, horizontal

## Setup

Requires Node.js 20 or later.

```bash
npm install
npm run studio
```

The Studio opens in your browser with the `demo` episode ("Pourquoi le ciel est bleu ?"). It plays with **estimated timing** until a voice is added.

## Making an episode

```bash
npm run new mon-sujet -- --theme pixel   # 1. create public/episodes/mon-sujet/episode.json
                                         # 2. write the script in that file
npm run studio                           # 3. preview (estimated timing)
npm run voice mon-sujet -- --voice <id>  # 4a. ElevenLabs voice + exact timing
npm run transcribe mon-sujet             # 4b. or: your own voice.mp3 + Whisper timing
npm run render mon-sujet                 # 5. out/mon-sujet.mp4
```

With `npm run`, put options after `--` (for example `npm run render demo -- --draft`).

### Step 4a: voice from ElevenLabs (recommended)

1. Create a `.env` file in the project root:
   ```
   ELEVENLABS_API_KEY=your_key_here
   ```
2. Copy a voice ID in ElevenLabs (Voices → your voice → Copy voice ID).
3. Run `npm run voice mon-sujet -- --voice <voiceId>`.

This sends the script to ElevenLabs and saves `voice.mp3` and `timing.json`, with exact word timings, in the episode folder.
The voice ID is saved in `episode.json`, so next time `npm run voice mon-sujet` is enough. Use a different voice per episode by changing `voice.voiceId`.

### Step 4b: your own recording (or audio made on the ElevenLabs website)

1. Run `npm run narration mon-sujet` to get the full text to read or paste.
2. Save the audio as `public/episodes/mon-sujet/voice.mp3`.
3. Run `npm run transcribe mon-sujet`.

This uses Whisper locally (free, offline). The first run downloads whisper.cpp and the `medium` model (about 1.5 GB) into `.whisper/`.
On macOS and Linux it is compiled, so you need `make` and a C compiler (on macOS: `xcode-select --install`). On Windows a prebuilt binary is used.
Options: `npm run transcribe mon-sujet -- --model small` is faster and less accurate; `--lang fr` is the default.

### Step 5: render

```bash
npm run render mon-sujet           # full quality: out/mon-sujet.mp4
npm run render mon-sujet -- --draft   # half resolution, faster, for checking
```

Before rendering, the script prints when each scene starts and lists any sync warnings.

## The episode file

`public/episodes/<id>/episode.json`:

```jsonc
{
  "title": "Pourquoi le ciel est bleu ?",
  "theme": "pixel",            // "clean" | "pixel"
  "format": "vertical",        // "vertical" | "square" | "horizontal"
  "fps": 30,
  "accent": "#FFD23F",         // optional: override the theme's highlight color
  "voice": { "file": "voice.mp3", "voiceId": "…", "model": "eleven_multilingual_v2", "volume": 1 },
  "music": { "file": "music.mp3", "volume": 0.08 },  // optional, fades in and out
  "captions": true,
  "speechRate": 2.6,           // words/second for estimated timing (before there's a voice)
  "endHold": 1.2,              // seconds kept after the last word
  "scenes": [ … ]
}
```

Every scene has:

| Field | Meaning |
|---|---|
| `type` | One of the scene types below |
| `say` | What the voice says during this scene. The scene starts on its first words. |
| `at` | Optional: start the scene on this phrase instead |
| `duration` | Only for a silent last scene (no `say`): seconds |

**Highlighting:** in any on-screen text, `**word**` is drawn in the accent color.

**Cues:** fields like `"at": "le bleu avec"` make an element appear when the voice says that phrase. Matching ignores accents, case and punctuation, and tolerates small transcription mistakes. `"5"` and `"cinq"` count as the same word.

### Scene types

**hook**: opening question, words fly in one by one.
```json
{ "type": "hook", "kicker": "SCIENCE EN 60 S", "emoji": "☀️", "title": "Pourquoi le ciel est **bleu** ?", "say": "…" }
```

**bullets**: a title and a list. Items appear on their `at` phrase, or are spread over the scene if there isn't one.
```json
{ "type": "bullets", "title": "La lumière **blanche**", "numbered": true, "say": "…",
  "items": [ { "emoji": "🌈", "text": "Un **mélange** de couleurs", "at": "mélange" } ] }
```

**stat**: a big number that counts up on `countAt`. Add `"bar": true` with `"suffix": "%"` for a 0–100 bar.
```json
{ "type": "stat", "kicker": "LE CHIFFRE", "prefix": "×", "value": 5, "decimals": 0, "suffix": "",
  "label": "plus de diffusion pour le **bleu**", "countAt": "cinq fois", "say": "…" }
```

**compare**: two cards with a VS badge. They are stacked on vertical video and side by side otherwise.
```json
{ "type": "compare", "title": "Résultat", "say": "…",
  "left":  { "label": "Bleu",  "emoji": "🔵", "text": "éparpillé partout" },
  "right": { "label": "Rouge", "emoji": "🔴", "text": "continue tout droit", "at": "tandis que" } }
```

**definition**: a term typed out, then its definition on `definitionAt`.
```json
{ "type": "definition", "kicker": "LE PHÉNOMÈNE", "term": "Diffusion Rayleigh",
  "definition": "Les molécules d'air **renvoient** la lumière.", "definitionAt": "renvoient", "say": "…" }
```

**image**: an image from the episode folder with a slow zoom (`"zoom": "in" | "out" | "none"`).
```json
{ "type": "image", "src": "schema.png", "title": "Le schéma", "caption": "Source : NASA", "say": "…" }
```

**outro**: call to action.
```json
{ "type": "outro", "emoji": "🌅", "title": "Abonne-toi !", "subtitle": "Le monde en **1 minute**",
  "button": "S'ABONNER", "handle": "@ta_chaine", "say": "…" }
```

## How the sync works

1. The script (all `say` texts) and the voice's word timestamps are split into words with accents, case and punctuation removed.
2. The two lists are aligned, so a misheard word, a missing word or an extra "euh" doesn't shift anything.
3. Each scene starts about 0.1 s before its first word, and each cue about 0.06 s before its phrase.
4. Captions show your script's text with the voice's timing.

If you change the script after making the voice, the alignment still works for the unchanged parts. Below 60% match, you'll see a warning to regenerate the voice.

## Checking timing

- **In the Studio:** a debug box shows the timing mode, the current scene and any warnings (for example, a cue phrase that isn't in the narration). It never appears in renders. To hide it in the Studio too, change `debug: true` to `false` in `src/Root.tsx`.
- **In the terminal:** `npm run timeline <id>` prints every scene and cue time.

## Themes

Themes live in `src/themes/index.ts`. Each one sets fonts, colors, corner radius, borders, shadows, spring physics, and `step` (`3` animates "on threes" for a retro feel).
To add a theme, copy `clean` or `pixel`, change the values, add it to `THEMES`, and add its name to `ThemeName` in `src/types.ts`.

## Project layout

```
public/episodes/<id>/     episode.json, voice.mp3, timing.json, images, music
src/types.ts              episode format (all fields documented)
src/lib/timeline.ts       sync engine (pure functions, unit-tested)
src/lib/load-episode.ts   loads an episode and measures the voice
src/Explainer.tsx         the video: background, scenes, captions, audio
src/scenes/               one file per scene type
src/components/           layout, animation primitives, captions, background
src/themes/               clean + pixel
scripts/                  CLI: new, narration, voice, transcribe, timeline, render
test/                     npm test
```

## Notes

- `*.mp3` and `*.wav` in `public/episodes` are git-ignored to keep the repo light. Remove those lines from `.gitignore` to commit them.
- Emoji are drawn with your system's emoji font (Segoe UI Emoji on Windows, Apple Color Emoji on macOS).
- Remotion is free for individuals and companies of up to 3 people. Larger companies need a [company license](https://www.remotion.dev/license).
