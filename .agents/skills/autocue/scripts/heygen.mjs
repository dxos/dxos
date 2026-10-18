#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Generates the clips for a scripted conversation with HeyGen avatars (API v3): one talking clip per line and one
 * silent "listening" clip per participant. `conversation.mjs` then cuts them into one track per participant.
 *
 *   HEYGEN_API_KEY=… node .agents/skills/autocue/scripts/heygen.mjs \
 *     --conversation packages/plugins/plugin-meeting/autocue/fieldstone-dashboard.conversation.json --out /tmp/meeting
 *
 * Casting: each participant's `prompt` generates a synthetic photo avatar (`POST /v3/avatars`, type `prompt`), and
 * its look id is written to `<out>/cast.json` so a rerun keeps the same face; `--cast-only` stops there so the faces
 * can be reviewed (`<out>/cast/<id>.webp`) before any video is paid for. A participant's `avatarId` or `voiceId`
 * wins over generation. Clips render on Avatar IV, whose `motion` and `expressiveness` settings set how much each
 * person moves; listening clips lip-sync to silence with the `listening` motion prompt. Files already in
 * `<out>/clips` are not regenerated.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const API = 'https://api.heygen.com';
const POLL_MS = 10_000;
const SUBMIT_SPACING_MS = 1_000;
const TIMEOUT_MS = 30 * 60_000;
/** Listening clips loop, so a short one is enough. */
const IDLE_SECONDS = 10;
const LISTENING =
  'Listening on a video call: attentive, smiling, small nods and natural blinks, mouth closed, hands resting.';

const { values: options } = parseArgs({
  options: {
    'conversation': { type: 'string' },
    'out': { type: 'string', default: 'heygen-out' },
    'resolution': { type: 'string', default: '720p' },
    'cast-only': { type: 'boolean', default: false },
  },
});
const key = process.env.HEYGEN_API_KEY;
if (!options.conversation || !key) {
  console.error('usage: HEYGEN_API_KEY=… heygen.mjs --conversation <file.json> [--out <dir>] [--cast-only]');
  process.exit(2);
}

const api = async (method, route, body) => {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: {
      'X-Api-Key': key,
      'accept': 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    throw new Error(`${method} ${route}: ${response.status} ${JSON.stringify(json.error ?? json)}`);
  }
  return json.data;
};

const poll = async (label, check) => {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(`${label} did not finish within ${TIMEOUT_MS / 60_000} minutes`);
};

const download = async (url, file) => {
  const response = await fetch(url);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
};

const conversation = JSON.parse(readFileSync(options.conversation, 'utf8'));
const clipsDir = path.join(options.out, 'clips');
const castDir = path.join(options.out, 'cast');
mkdirSync(clipsDir, { recursive: true });
mkdirSync(castDir, { recursive: true });

/** Generates a look for every participant that has none, and records it with its voice in `cast.json`. */
const cast = async () => {
  const castFile = path.join(options.out, 'cast.json');
  const saved = existsSync(castFile) ? JSON.parse(readFileSync(castFile, 'utf8')) : {};
  const roster = {};
  for (const [id, participant] of Object.entries(conversation.participants)) {
    const avatarId = participant.avatarId ?? saved[id]?.avatarId;
    roster[id] = { avatarId, voiceId: participant.voiceId ?? saved[id]?.voiceId };
    if (!avatarId) {
      if (!participant.prompt) {
        throw new Error(`${id}: set avatarId or prompt in the conversation file`);
      }
      const { avatar_item: item } = await api('POST', '/v3/avatars', {
        type: 'prompt',
        name: `${path.basename(options.conversation, '.conversation.json')}-${id}`,
        prompt: participant.prompt,
        aspect_ratio: '16:9',
      });
      roster[id].avatarId = item.id;
      console.log(`generating ${id} (${item.id})`);
    }
    if (!roster[id].voiceId) {
      throw new Error(`${id}: set voiceId in the conversation file (GET /v3/voices lists them)`);
    }
    writeFileSync(castFile, JSON.stringify({ ...saved, ...roster }, null, 2));
  }

  await Promise.all(
    Object.entries(roster).map(async ([id, { avatarId }]) => {
      const look = await poll(`look ${id}`, async () => {
        const look = await api('GET', `/v3/avatars/looks/${avatarId}`);
        if (look.status === 'failed') {
          throw new Error(`look ${id} failed: ${JSON.stringify(look)}`);
        }
        return look.status === 'processing' ? undefined : look;
      });
      const preview = path.join(castDir, `${id}.webp`);
      if (look.preview_image_url && !existsSync(preview)) {
        await download(look.preview_image_url, preview);
      }
    }),
  );
  return roster;
};

/** A silent audio asset to lip-sync the listening clips to; v3 takes no silence voice. */
const silence = async () => {
  const file = path.join(options.out, 'silence.wav');
  execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', [
    ...['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono'],
    ...['-t', String(IDLE_SECONDS), file],
  ]);
  const form = new FormData();
  form.append('file', new Blob([readFileSync(file)], { type: 'audio/wav' }), 'silence.wav');
  const response = await fetch(`${API}/v3/assets`, { method: 'POST', headers: { 'X-Api-Key': key }, body: form });
  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(`POST /v3/assets: ${response.status} ${JSON.stringify(json.error ?? json)}`);
  }
  return json.data.asset_id;
};

/** Submits one clip on Avatar IV, waits for it, and downloads it to `file`. */
const generate = async (file, request) => {
  const { video_id: videoId } = await api('POST', '/v3/videos', {
    type: 'avatar',
    resolution: options.resolution,
    aspect_ratio: '16:9',
    engine: { type: 'avatar_iv' },
    ...request,
  });
  console.log(`submitted ${path.basename(file)} (${videoId})`);
  const video = await poll(path.basename(file), async () => {
    const video = await api('GET', `/v3/videos/${videoId}`);
    if (video.status === 'failed') {
      throw new Error(`${path.basename(file)} failed: ${video.failure_code} ${video.failure_message}`);
    }
    return video.status === 'completed' ? video : undefined;
  });
  await download(video.video_url, file);
  console.log(`downloaded ${path.basename(file)}`);
};

const roster = await cast();
console.log(JSON.stringify({ cast: roster, previews: castDir }, null, 2));
if (options['cast-only']) {
  process.exit(0);
}

const jobs = [
  ...Object.keys(conversation.participants).map((id) => ({
    file: path.join(clipsDir, `idle-${id}.mp4`),
    speaker: id,
    listening: true,
  })),
  ...conversation.lines.map((line, index) => ({
    file: path.join(clipsDir, `${String(index).padStart(2, '0')}-${line.speaker}.mp4`),
    speaker: line.speaker,
    text: line.text,
  })),
].filter(({ file }) => !existsSync(file));
const silenceAssetId = jobs.some(({ listening }) => listening) ? await silence() : undefined;

// HeyGen renders submissions concurrently, so waiting on them together takes as long as the slowest.
// Submissions are staggered: the API allows 10 requests per second, polls included.
const results = await Promise.allSettled(
  jobs.map(async ({ file, speaker, text, listening }, index) => {
    await new Promise((resolve) => setTimeout(resolve, index * SUBMIT_SPACING_MS));
    const participant = conversation.participants[speaker];
    return generate(file, {
      avatar_id: roster[speaker].avatarId,
      ...(listening
        ? { audio_asset_id: silenceAssetId, motion_prompt: LISTENING, expressiveness: 'low' }
        : {
            script: text,
            voice_id: roster[speaker].voiceId,
            ...(participant.motion ? { motion_prompt: participant.motion } : {}),
            expressiveness: participant.expressiveness ?? 'medium',
          }),
    });
  }),
);
const failures = results.flatMap((result, index) =>
  result.status === 'rejected' ? [`${jobs[index].file}: ${result.reason.message}`] : [],
);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ clips: clipsDir }, null, 2));
