//
// Copyright 2026 DXOS.org
//

/**
 * Narrates a finished demo with HeyGen text-to-speech: each cue is spoken by one voice and placed at its
 * time on the video, then the mix is muxed in as the video's audio track.
 *
 *   node voiceover.mjs --in demo.webm --cues cues.json [--out demo.voiced.webm] [--voice <id>] [--speed 1]
 *   node voiceover.mjs --voices                       # list Starfish voices (id, name, language, gender)
 *
 * `cues.json` is `[{ "at": 0.4, "text": "This is Composer." }, …]`, times in seconds of the input video.
 * Reads `HEYGEN_API_KEY` from the environment, else from `.secrets/heygen.env` at the repo root.
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
const API = 'https://api.heygen.com';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index++) {
  const key = args[index].replace(/^--/, '');
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    options[key] = true;
    continue;
  }
  options[key] = value;
  index++;
}

const apiKey = (() => {
  if (process.env.HEYGEN_API_KEY) {
    return process.env.HEYGEN_API_KEY;
  }
  const file = path.join(ROOT, '.secrets/heygen.env');
  const match = existsSync(file) && readFileSync(file, 'utf8').match(/^HEYGEN_API_KEY=(.+)$/m);
  if (!match) {
    console.error(`no HEYGEN_API_KEY: set it in the environment or in ${file}`);
    process.exit(1);
  }
  return match[1].trim();
})();

const heygen = async (method, route, body) => {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    throw new Error(`${method} ${route} → ${response.status}: ${JSON.stringify(json.error ?? json).slice(0, 400)}`);
  }
  return json.data ?? json;
};

const listVoices = async () => {
  const data = await heygen('GET', '/v3/voices?engine=starfish');
  return data.voices ?? data;
};

if (options.voices) {
  for (const voice of await listVoices()) {
    console.log([voice.voice_id, voice.name, voice.language, voice.gender].join('\t'));
  }
  process.exit(0);
}

if (!options.in || !options.cues || !existsSync(options.in) || !existsSync(options.cues)) {
  console.error('usage: node voiceover.mjs --in <video> --cues <cues.json> [--out <video>] [--voice <id>]');
  process.exit(1);
}

const cues = JSON.parse(readFileSync(options.cues, 'utf8'));
const extension = path.extname(options.in);
const output = options.out ?? options.in.replace(new RegExp(`${extension}$`), `.voiced${extension}`);
const work = path.join(path.dirname(output), `${path.basename(output, extension)}.voice`);
mkdirSync(work, { recursive: true });

// Without a voice, the first English one in the catalog, so a run needs no setup beyond the key.
const voice =
  options.voice ??
  (await listVoices()).find((entry) => /^en/i.test(entry.language ?? '') || /english/i.test(entry.language ?? ''))
    ?.voice_id;
if (!voice) {
  console.error('no voice: pass --voice <id> (see --voices)');
  process.exit(1);
}

const clips = [];
for (const [index, cue] of cues.entries()) {
  const { audio_url: url, duration } = await heygen('POST', '/v3/voices/speech', {
    text: cue.text,
    voice_id: voice,
    speed: Number(options.speed ?? 1),
    language: 'en',
  });
  const file = path.join(work, `${String(index + 1).padStart(2, '0')}${path.extname(new URL(url).pathname) || '.mp3'}`);
  writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
  clips.push({ ...cue, file, duration });
  const next = cues[index + 1];
  if (next && cue.at + duration > next.at) {
    console.error(`cue ${index + 1} runs ${(cue.at + duration - next.at).toFixed(1)}s into the next one; shorten it`);
  }
}

// Each clip delayed to its cue, then summed; `normalize=0` keeps every clip at full level instead of
// dividing by the input count.
const filter =
  clips.map((clip, index) => `[${index + 1}:a]adelay=${Math.round(clip.at * 1000)}:all=1[a${index}]`).join(';') +
  `;${clips.map((_, index) => `[a${index}]`).join('')}amix=inputs=${clips.length}:normalize=0[voice]`;

const mux = spawn(FFMPEG, [
  '-hide_banner',
  '-loglevel',
  'error',
  '-i',
  options.in,
  ...clips.flatMap((clip) => ['-i', clip.file]),
  '-filter_complex',
  filter,
  '-map',
  '0:v',
  '-map',
  '[voice]',
  // Subtitle and chapter tracks ride along when the container carries them.
  '-map',
  '0:s?',
  '-c:v',
  'copy',
  '-c:s',
  'copy',
  '-c:a',
  extension === '.webm' ? 'libopus' : 'aac',
  '-b:a',
  '128k',
  '-y',
  output,
]);
mux.stderr.pipe(process.stderr);
const [code] = await once(mux, 'close');
if (code !== 0) {
  console.error(`ffmpeg mux failed (exit ${code})`);
  process.exit(1);
}

console.log(
  JSON.stringify({ output, voice, cues: clips.map(({ at, text, duration }) => ({ at, duration, text })) }, null, 2),
);
