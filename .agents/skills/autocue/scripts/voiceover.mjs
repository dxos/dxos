//
// Copyright 2026 DXOS.org
//

/**
 * Narrates a finished demo with HeyGen text-to-speech: each cue is spoken by one voice and placed at its
 * time on the video, then the mix is muxed in as the video's audio track.
 *
 *   node voiceover.mjs --in demo.webm --cues cues.json [--out demo.voiced.webm] [--voice <id|name>] [--speed 1]
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
  // A harness worktree's `.secrets/` starts empty, so the primary checkout's is read too.
  const primary = ROOT.split(`${path.sep}.claude${path.sep}worktrees${path.sep}`)[0];
  const roots = [...new Set([ROOT, primary])];
  // `.env` is `op inject -i .env.tpl -o .env` output (`export HEYGEN_API_KEY="…"`); never committed.
  for (const file of roots.map((root) => path.join(root, '.env')).filter((candidate) => existsSync(candidate))) {
    const match = readFileSync(file, 'utf8').match(/^(?:export )?HEYGEN_API_KEY=(.+)$/m);
    if (match?.[1].trim()) {
      return match[1].trim().replace(/^"(.*)"$/, '$1');
    }
  }
  const files = roots.flatMap((root) => ['heygen.env', 'heygen.txt'].map((name) => path.join(root, '.secrets', name)));
  for (const file of files.filter((candidate) => existsSync(candidate))) {
    // Either `HEYGEN_API_KEY=<key>` or the bare key.
    const key = readFileSync(file, 'utf8')
      .replace(/^HEYGEN_API_KEY=/m, '')
      .trim();
    if (key) {
      return key;
    }
  }
  console.error(`no HEYGEN_API_KEY: set it in the environment or in one of ${files.join(', ')}`);
  process.exit(1);
})();

/** HeyGen answers 503 when text-to-speech is overloaded and 429 when rate limited; both clear within seconds. */
const RETRYABLE = new Set([429, 503]);

const heygen = async (method, route, body) => {
  let response;
  for (let attempt = 0; attempt < 6; attempt++) {
    response = await fetch(`${API}${route}`, {
      method,
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      ...(body && { body: JSON.stringify(body) }),
    });
    if (!RETRYABLE.has(response.status)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000 * 2 ** attempt));
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    throw new Error(`${method} ${route} → ${response.status}: ${JSON.stringify(json.error ?? json).slice(0, 400)}`);
  }
  return json;
};

/**
 * The account's own voices first, then the public Starfish catalog; the speech endpoint also takes a private
 * voice on another engine (ElevenLabs). Pages are chained by `next_token`, passed back as `token`.
 */
const listVoices = async () => [...(await listPages('type=private')), ...(await listPages('engine=starfish'))];

const listPages = async (filter) => {
  const voices = [];
  let token;
  do {
    const page = await heygen('GET', `/v3/voices?${filter}${token ? `&token=${encodeURIComponent(token)}` : ''}`);
    voices.push(...page.data);
    token = page.has_more ? page.next_token : undefined;
  } while (token);
  return voices;
};

if (options.voices) {
  for (const voice of await listVoices()) {
    console.log([voice.voice_id, voice.name, voice.language, voice.gender].join('\t'));
  }
  process.exit(0);
}

// `--in a.webm,a.mp4` voices every copy from one set of clips, so the speech is synthesized once.
const inputs = typeof options.in === 'string' ? options.in.split(',') : [];
if (!inputs.length || !options.cues || !existsSync(options.cues) || inputs.some((input) => !existsSync(input))) {
  console.error(
    'usage: node voiceover.mjs --in <video>[,<video>] --cues <cues.json> [--out <video>] [--voice <id|name>]',
  );
  process.exit(1);
}

const cues = JSON.parse(readFileSync(options.cues, 'utf8'));
const voicedPath = (input) => {
  const extension = path.extname(input);
  return input.replace(new RegExp(`${extension}$`), `.voiced${extension}`);
};
const outputs = inputs.length === 1 && options.out ? [options.out] : inputs.map(voicedPath);
const work = `${outputs[0].replace(/\.[^.]+$/, '')}.voice`;
mkdirSync(work, { recursive: true });

/** The house narrator: a private voice on the DXOS HeyGen account. */
const DEFAULT_VOICE = 'Britpop';

// `--voice` is an id or the start of a name, own voices first; an account without the default voice falls
// back to the first English one listed.
const voice = await (async () => {
  const voices = await listVoices();
  const wanted = typeof options.voice === 'string' ? options.voice : DEFAULT_VOICE;
  const match =
    voices.find((entry) => entry.voice_id === wanted || entry.name.toLowerCase().startsWith(wanted.toLowerCase())) ??
    (options.voice === undefined ? voices.find((entry) => /^en|english/i.test(entry.language ?? '')) : undefined);
  return match?.voice_id ?? options.voice;
})();
if (!voice) {
  console.error('no voice: pass --voice <id|name> (see --voices)');
  process.exit(1);
}

const clips = [];
for (const [index, cue] of cues.entries()) {
  const {
    data: { audio_url: url, duration },
  } = await heygen('POST', '/v3/voices/speech', {
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

const mux = async (input, output) => {
  const proc = spawn(FFMPEG, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    input,
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
    path.extname(output) === '.webm' ? 'libopus' : 'aac',
    '-b:a',
    '128k',
    '-y',
    output,
  ]);
  proc.stderr.pipe(process.stderr);
  const [code] = await once(proc, 'close');
  if (code !== 0) {
    console.error(`ffmpeg mux of ${input} failed (exit ${code})`);
    process.exit(1);
  }
};

for (const [index, input] of inputs.entries()) {
  await mux(input, outputs[index]);
}

console.log(
  JSON.stringify({ outputs, voice, cues: clips.map(({ at, text, duration }) => ({ at, duration, text })) }, null, 2),
);
