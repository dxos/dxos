#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Generates the clips for a scripted conversation with HeyGen avatars: one talking clip per line and one silent
 * "listening" clip per participant. `conversation.mjs` then cuts them into one track per participant.
 *
 *   HEYGEN_API_KEY=… node .agents/skills/autocue/scripts/heygen.mjs \
 *     --conversation packages/plugins/plugin-meeting/autocue/fieldstone-dashboard.conversation.json --out /tmp/meeting
 *
 * Casting: a participant's `avatarId`/`voiceId` in the conversation file win; otherwise the first unused stock
 * avatar and voice matching its `voice` gender are taken, and the choice is written to `<out>/cast.json` so a
 * rerun keeps the same faces. Edit that file to recast. Clips already in `<out>/clips` are not regenerated.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const API = 'https://api.heygen.com';
const POLL_MS = 10_000;
const TIMEOUT_MS = 30 * 60_000;
/** Listening clips loop, so a short one is enough. */
const IDLE_SECONDS = 10;

const { values: options } = parseArgs({
  options: {
    conversation: { type: 'string' },
    out: { type: 'string', default: 'heygen-out' },
    width: { type: 'string', default: '1280' },
    height: { type: 'string', default: '720' },
  },
});
const key = process.env.HEYGEN_API_KEY;
if (!options.conversation || !key) {
  console.error('usage: HEYGEN_API_KEY=… heygen.mjs --conversation <file.json> [--out <dir>]');
  process.exit(2);
}

const api = async (method, route, body) => {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: { 'X-Api-Key': key, 'content-type': 'application/json', 'accept': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    throw new Error(`${method} ${route}: ${response.status} ${JSON.stringify(json.error ?? json)}`);
  }
  return json.data;
};

const conversation = JSON.parse(readFileSync(options.conversation, 'utf8'));
const clipsDir = path.join(options.out, 'clips');
mkdirSync(clipsDir, { recursive: true });

/** Fills in an avatar and voice for every participant that has none. */
const cast = async () => {
  const castFile = path.join(options.out, 'cast.json');
  const saved = existsSync(castFile) ? JSON.parse(readFileSync(castFile, 'utf8')) : {};
  const roster = Object.fromEntries(
    Object.entries(conversation.participants).map(([id, participant]) => [
      id,
      { avatarId: participant.avatarId ?? saved[id]?.avatarId, voiceId: participant.voiceId ?? saved[id]?.voiceId },
    ]),
  );

  const missing = Object.entries(roster).filter(([, { avatarId, voiceId }]) => !avatarId || !voiceId);
  if (missing.length > 0) {
    const [{ avatars }, { voices }] = await Promise.all([api('GET', '/v2/avatars'), api('GET', '/v2/voices')]);
    const english = voices.filter((voice) => /english/i.test(voice.language ?? ''));
    const used = new Set(Object.values(roster).flatMap(({ avatarId, voiceId }) => [avatarId, voiceId]));
    const choose = (list, idKey, gender) => {
      const match = list.find((item) => !used.has(item[idKey]) && item.gender?.toLowerCase() === gender);
      if (!match) {
        throw new Error(`no unused ${gender} ${idKey} left; set one in the conversation file`);
      }
      used.add(match[idKey]);
      return match[idKey];
    };
    for (const [id, entry] of missing) {
      const gender = conversation.participants[id].voice;
      entry.avatarId ??= choose(avatars, 'avatar_id', gender);
      entry.voiceId ??= choose(english, 'voice_id', gender);
    }
  }

  writeFileSync(castFile, JSON.stringify(roster, null, 2));
  return roster;
};

/** Submits one clip, waits for it, and downloads it to `file`. */
const generate = async (file, { avatarId }, voice) => {
  if (existsSync(file)) {
    return;
  }
  const { video_id: videoId } = await api('POST', '/v2/video/generate', {
    video_inputs: [{ character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' }, voice }],
    dimension: { width: Number(options.width), height: Number(options.height) },
  });
  console.log(`submitted ${path.basename(file)} (${videoId})`);
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await api('GET', `/v1/video_status.get?video_id=${videoId}`);
    if (status.status === 'completed') {
      const response = await fetch(status.video_url);
      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
      console.log(`downloaded ${path.basename(file)}`);
      return;
    }
    if (status.status === 'failed') {
      throw new Error(`${path.basename(file)} failed: ${JSON.stringify(status.error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(`${path.basename(file)} did not finish within ${TIMEOUT_MS / 60_000} minutes`);
};

const roster = await cast();
const jobs = [
  ...Object.keys(conversation.participants).map((id) => ({
    file: path.join(clipsDir, `idle-${id}.mp4`),
    speaker: id,
    voice: { type: 'silence', duration: String(IDLE_SECONDS) },
  })),
  ...conversation.lines.map((line, index) => ({
    file: path.join(clipsDir, `${String(index).padStart(2, '0')}-${line.speaker}.mp4`),
    speaker: line.speaker,
    voice: { type: 'text', input_text: line.text, voice_id: roster[line.speaker].voiceId },
  })),
];

// HeyGen renders submissions concurrently, so waiting on them together takes as long as the slowest.
const results = await Promise.allSettled(
  jobs.map(({ file, speaker, voice }) => generate(file, roster[speaker], voice)),
);
const failures = results.flatMap((result, index) =>
  result.status === 'rejected' ? [`${jobs[index].file}: ${result.reason.message}`] : [],
);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ clips: clipsDir, cast: roster }, null, 2));
