#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Generates the clips for a scripted conversation with HeyGen avatars (API v3): one talking clip per line and one
 * silent "listening" clip per participant. `conversation.mjs` then cuts them into one track per participant.
 *
 *   HEYGEN_API_KEY=... node .agents/skills/autocue/scripts/heygen.mjs \
 *     --conversation packages/plugins/plugin-meeting/autocue/fieldstone-dashboard.conversation.json --out /tmp/meeting
 *
 * Casting: each participant's `image` (a URL, e.g. a Higgsfield still, or a file beside the conversation) becomes a
 * photo avatar, or its `prompt` generates a synthetic one (`POST /v3/avatars`), and
 * its look id is written to `<out>/cast.json` so a rerun keeps the same face; `--cast-only` stops there so the faces
 * can be reviewed (`<out>/cast/<id>.webp`) before any video is paid for. A participant's `avatarId` or `voiceId`
 * wins over generation. Clips render on Avatar IV, whose `motion` and `expressiveness` settings set how much each
 * person moves; listening clips lip-sync to silence with the `listening` motion prompt, and a line with no `text`
 * is a silent gesture of `seconds` directed by its `motion` (a wave, a nod). Files already in
 * `<out>/clips` are not regenerated.
 *
 * `--takes <dir>` then renders one continuous take per speaker, `<out>/clips/take-<id>.mp4`, lip-synced to their whole
 * track (`<dir>/<id>.wav`, from `conversation.mjs --audio`) with the `TAKE` motion prompt, so the track has no cuts.
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
/** Low expressiveness and a "while silent" direction keep a whole-track take from acting or staring. */
const TAKE =
  'A real person on a business video call, one continuous take, fixed camera. While they speak: calm, natural, ' +
  'small conversational mouth movements and an occasional small hand gesture. While they are silent: mouth closed, ' +
  'they listen, nod now and then, glance down at their desk and type notes on a keyboard below the frame, then look ' +
  'back at the camera. Professional and understated.';

const { values: options } = parseArgs({
  options: {
    'conversation': { type: 'string' },
    'out': { type: 'string', default: 'heygen-out' },
    'resolution': { type: 'string', default: '720p' },
    'cast-only': { type: 'boolean', default: false },
    'takes': { type: 'string' },
  },
});
const key = process.env.HEYGEN_API_KEY;
if (!options.conversation || !key) {
  console.error(
    'usage: HEYGEN_API_KEY=... heygen.mjs --conversation <file.json> [--out <dir>] [--cast-only] [--takes <audio dir>]',
  );
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
  // An error body saved as the clip would be skipped as done on every rerun.
  if (!response.ok) {
    throw new Error(`download ${path.basename(file)}: ${response.status}`);
  }
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
      const name = `${path.basename(options.conversation, '.conversation.json')}-${id}`;
      const request = participant.image
        ? { type: 'photo', name, file: await imageFile(participant.image) }
        : participant.prompt
          ? { type: 'prompt', name, prompt: participant.prompt, aspect_ratio: '16:9' }
          : undefined;
      if (!request) {
        throw new Error(`${id}: set avatarId, image or prompt in the conversation file`);
      }
      const { avatar_item: item } = await api('POST', '/v3/avatars', request);
      roster[id].avatarId = item.id;
      console.log(`creating ${id} (${item.id})`);
    }
    const speaks = conversation.lines.some((line) => line.speaker === id && line.text);
    if (speaks && !roster[id].voiceId) {
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

/** Uploads a local file and returns its asset id. */
const upload = async (file, type) => {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(file)], { type }), path.basename(file));
  const response = await fetch(`${API}/v3/assets`, { method: 'POST', headers: { 'X-Api-Key': key }, body: form });
  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(`POST /v3/assets: ${response.status} ${JSON.stringify(json.error ?? json)}`);
  }
  return json.data.asset_id;
};

/** A participant's `image`: a URL, or a file relative to the conversation file. */
const imageFile = async (image) =>
  /^https?:/.test(image)
    ? { type: 'url', url: image }
    : {
        type: 'asset_id',
        asset_id: await upload(path.resolve(path.dirname(options.conversation), image), 'image/png'),
      };

const silences = new Map();
/** A silent audio asset of `seconds` to lip-sync listening and gesture clips to; v3 takes no silence voice. */
const silence = (seconds) => {
  if (!silences.has(seconds)) {
    const file = path.join(options.out, `silence-${seconds}.wav`);
    execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', [
      ...['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono'],
      ...['-t', String(seconds), file],
    ]);
    silences.set(seconds, upload(file, 'audio/wav'));
  }
  return silences.get(seconds);
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

const takes = (dir) =>
  Object.keys(conversation.participants)
    .filter((id) => existsSync(path.join(dir, `${id}.wav`)))
    .map((id) => ({ file: path.join(clipsDir, `take-${id}.mp4`), speaker: id, take: path.join(dir, `${id}.wav`) }));

const jobs = (
  options.takes
    ? takes(options.takes)
    : [
        ...Object.keys(conversation.participants).map((id) => ({
          file: path.join(clipsDir, `idle-${id}.mp4`),
          speaker: id,
          listening: true,
        })),
        ...conversation.lines.map((line, index) => ({
          file: path.join(clipsDir, `${String(index).padStart(2, '0')}-${line.speaker}.mp4`),
          speaker: line.speaker,
          text: line.text,
          gesture: line.text ? undefined : { motion: line.motion, seconds: line.seconds },
        })),
      ]
).filter(({ file }) => !existsSync(file));

// HeyGen renders submissions concurrently, so waiting on them together takes as long as the slowest.
// Submissions are staggered: the API allows 10 requests per second, polls included.
const results = await Promise.allSettled(
  jobs.map(async ({ file, speaker, text, listening, gesture, take }, index) => {
    await new Promise((resolve) => setTimeout(resolve, index * SUBMIT_SPACING_MS));
    const participant = conversation.participants[speaker];
    return generate(file, {
      avatar_id: roster[speaker].avatarId,
      ...(take
        ? { audio_asset_id: await upload(take, 'audio/wav'), motion_prompt: TAKE, expressiveness: 'low' }
        : listening
          ? { audio_asset_id: await silence(IDLE_SECONDS), motion_prompt: LISTENING, expressiveness: 'low' }
          : gesture
            ? {
                audio_asset_id: await silence(gesture.seconds),
                motion_prompt: gesture.motion,
                expressiveness: 'medium',
              }
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
