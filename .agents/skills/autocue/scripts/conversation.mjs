#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Cuts a scripted conversation's clips (from `heygen.mjs`) into one track per participant, all the same length.
 *
 *   node .agents/skills/autocue/scripts/conversation.mjs \
 *     --conversation packages/plugins/plugin-meeting/autocue/fieldstone-dashboard.conversation.json \
 *     --clips /tmp/meeting/clips --out /tmp/meeting/tracks
 *
 * Lines play one after another, `gap` seconds apart, after a silent `leadIn`, except a line with `at`, which starts
 * that many seconds after the lead-in; a line with no `text` is a silent gesture. A participant shows their looping
 * listening clip whenever someone else is speaking. Every track starts on the same lead-in, so tracks started
 * together stay in step: `fake-media.mjs` loops the lead-in until its cue and `CallSimulation.start()` plays from
 * the top on join.
 *
 * Writes `<out>/<participant>.webm` (VP9 + Opus, which Chromium decodes), `<out>/conversation.wav` (every voice,
 * mixed, to lay under the screen recording, which captures no sound) and `<out>/timeline.json` (each spoken line's
 * start and end in seconds, and the gestures').
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: options } = parseArgs({
  options: {
    conversation: { type: 'string' },
    clips: { type: 'string' },
    out: { type: 'string', default: 'conversation-out' },
    width: { type: 'string', default: '1280' },
    height: { type: 'string', default: '720' },
    fps: { type: 'string', default: '25' },
  },
});
if (!options.conversation || !options.clips) {
  console.error('usage: conversation.mjs --conversation <file.json> --clips <dir> [--out <dir>]');
  process.exit(2);
}

const ffmpeg = process.env.FFMPEG_PATH ?? 'ffmpeg';
const run = (args) =>
  execFileSync(ffmpeg, ['-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const duration = (file) =>
  Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
      encoding: 'utf8',
    }).trim(),
  );

const conversation = JSON.parse(readFileSync(options.conversation, 'utf8'));
const { leadIn = 3, gap = 0.4, tail = 3 } = conversation;
const work = path.join(options.out, 'work');
mkdirSync(work, { recursive: true });

// Every segment shares one frame size, rate and audio layout, so the per-participant concat needs no re-timing.
const video = `scale=${options.width}:${options.height}:force_original_aspect_ratio=increase,crop=${options.width}:${options.height},fps=${options.fps},format=yuv420p`;
const intermediate = [
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-crf',
  '16',
  '-c:a',
  'pcm_s16le',
  '-ar',
  '48000',
  '-ac',
  '2',
];

// Loudness-normalized speech crosses plugin-calls' speaking threshold however quietly the avatar was rendered.
// A line without `text` is a silent gesture (a wave, a nod), so there is no speech to normalize.
const lines = conversation.lines.map((line, index) => {
  const source = path.join(options.clips, `${String(index).padStart(2, '0')}-${line.speaker}.mp4`);
  const file = path.join(work, `line-${index}.mkv`);
  const audio = line.text ? ['-af', 'loudnorm=I=-16:TP=-1.5'] : [];
  run(['-i', source, '-vf', video, ...audio, ...intermediate, file]);
  return { ...line, file, seconds: duration(file) };
});

const idle = Object.fromEntries(
  Object.keys(conversation.participants).map((id) => {
    const file = path.join(work, `idle-${id}.mkv`);
    run(['-i', path.join(options.clips, `idle-${id}.mp4`), '-vf', video, '-an', ...intermediate.slice(0, 6), file]);
    return [id, { file, seconds: duration(file) }];
  }),
);

// A line with `at` starts that many seconds after the lead-in; the rest follow the last spoken line. Gestures never
// hold up the speech, so a wave can overlap a greeting.
let clock = leadIn;
const placed = lines.map((line) => {
  const start = line.at === undefined ? clock : leadIn + line.at;
  const entry = { speaker: line.speaker, text: line.text, start, end: start + line.seconds };
  if (line.text) {
    clock = Math.max(clock, entry.end + gap);
  }
  return entry;
});
const timeline = placed.filter((entry) => entry.text);
const total = Math.max(...placed.map((entry) => entry.end)) + tail;

/** `seconds` of a participant's listening loop, continuing where its last stretch left off so the loop seam moves. */
const idleSegment = (id, seconds, offset, file) => {
  run([
    ...['-stream_loop', '-1', '-ss', String(offset % idle[id].seconds), '-i', idle[id].file],
    ...['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'],
    ...['-t', seconds.toFixed(3), '-map', '0:v', '-map', '1:a', ...intermediate, file],
  ]);
};

const tracks = Object.keys(conversation.participants).map((id) => {
  const segments = [];
  let position = 0;
  let idleOffset = 0;
  const listen = (until) => {
    if (until - position > 0.01) {
      const file = path.join(work, `${id}-${segments.length}.mkv`);
      idleSegment(id, until - position, idleOffset, file);
      idleOffset += until - position;
      segments.push(file);
      position = until;
    }
  };
  placed
    .map((entry, index) => ({ ...entry, index }))
    .filter((entry) => entry.speaker === id)
    .sort((a, b) => a.start - b.start)
    .forEach((entry) => {
      if (entry.start < position - 0.01) {
        throw new Error(`${id}: line ${entry.index} starts before their previous one ends`);
      }
      listen(entry.start);
      segments.push(lines[entry.index].file);
      position = entry.end;
    });
  listen(total);

  const list = path.join(work, `${id}.txt`);
  writeFileSync(list, segments.map((file) => `file '${path.resolve(file)}'`).join('\n'));
  const track = path.join(options.out, `${id}.webm`);
  run([
    ...['-f', 'concat', '-safe', '0', '-i', list],
    ...['-c:v', 'libvpx-vp9', '-b:v', '1500k', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1'],
    ...['-c:a', 'libopus', '-b:a', '96k', track],
  ]);
  return track;
});

run([
  ...tracks.flatMap((track) => ['-i', track]),
  ...['-filter_complex', `amix=inputs=${tracks.length}:normalize=0`, '-vn', path.join(options.out, 'conversation.wav')],
]);
const gestures = placed.filter((entry) => !entry.text).map(({ speaker, start, end }) => ({ speaker, start, end }));
writeFileSync(
  path.join(options.out, 'timeline.json'),
  JSON.stringify({ leadIn, total, lines: timeline, gestures }, null, 2),
);
console.log(JSON.stringify({ tracks, total: Number(total.toFixed(2)) }, null, 2));
