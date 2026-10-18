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
 * that many seconds after the lead-in; a line with no `text` is a silent gesture. Between their lines a participant
 * shows `listen-<id>-<n>.mp4` (their n-th gap of 2.5s or more, retimed to fit; `--plan` lists them) or, for a shorter
 * pause, `still-<id>.png`; without those they fall back to their looping listening clip. A `take-<id>.mp4` (one
 * continuous render lip-synced to the participant's whole track) replaces all of that stitching; `--audio` writes each
 * speaker's whole track as `<out>/<id>.wav` for `heygen.mjs --takes` to render those from. Every track starts
 * on the same lead-in, so tracks started together stay in step: `fake-media.mjs` loops the lead-in until its cue and
 * `CallSimulation.start()` plays from the top on join.
 *
 * Writes `<out>/<participant>.webm` (VP9 + Opus, which Chromium decodes), `<out>/conversation.wav` (every voice,
 * mixed, to lay under the screen recording, which captures no sound) and `<out>/timeline.json` (each spoken line's
 * start and end in seconds, and the gestures').
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
    plan: { type: 'boolean', default: false },
    audio: { type: 'boolean', default: false },
    screenshare: { type: 'string', multiple: true, default: [] },
    xfade: { type: 'string', default: '0' },
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
  if (options.plan) {
    return { ...line, file, seconds: duration(source) };
  }
  const audio = line.text ? ['-af', 'loudnorm=I=-16:TP=-1.5'] : [];
  run(['-i', source, '-vf', video, ...audio, ...intermediate, file]);
  return { ...line, file, seconds: duration(file) };
});

const idle = Object.fromEntries(
  Object.keys(conversation.participants).flatMap((id) => {
    const source = path.join(options.clips, `idle-${id}.mp4`);
    if (options.plan || !existsSync(source)) {
      return [];
    }
    const file = path.join(work, `idle-${id}.mkv`);
    run(['-i', source, '-vf', video, '-an', ...intermediate.slice(0, 6), file]);
    return [[id, { file, seconds: duration(file) }]];
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

/** `seconds` of a dedicated listening clip, retimed to fill its gap exactly. */
const listenSegment = (source, seconds, file) => {
  const factor = seconds / duration(source);
  run([
    ...['-i', source, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'],
    ...['-vf', `setpts=${factor.toFixed(5)}*PTS,${video}`, '-t', seconds.toFixed(3)],
    ...['-map', '0:v', '-map', '1:a', ...intermediate, file],
  ]);
};

/** `seconds` of the participant's still, for a pause too short to be worth its own footage. */
const stillSegment = (still, seconds, file) => {
  run([
    ...['-loop', '1', '-i', still, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'],
    ...['-vf', video, '-t', seconds.toFixed(3), '-map', '0:v', '-map', '1:a', ...intermediate, file],
  ]);
};

/** Gaps at least this long get their own listening clip (`listen-<id>-<n>.mp4`); shorter ones hold `still-<id>.png`. */
const MIN_LISTEN = 2.5;
const plan = [];

/**
 * Seconds of crossfade at each join between a line and the footage around it (`--xfade`). Clips aligned to the
 * participant's still (`align.py`) cut cleanly, so the default is none; for unaligned renders a fade hides the jump.
 * The filler is rendered that much longer on each side it meets a line, so the lines keep their exact times.
 */
const XFADE = Number(options.xfade);

/**
 * Writes a participant's audio as a concat list: each line's own sound and exact silences, so speech keeps its time
 * whatever the picture does.
 */
const audioParts = (id, parts) => {
  const audios = parts.map((part, index) => {
    const file = path.join(work, `${id}-${index}.wav`);
    if (part.fixed) {
      run(['-i', part.fixed, '-vn', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', file]);
    } else {
      run([
        ...['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'],
        ...['-t', part.seconds.toFixed(3), '-c:a', 'pcm_s16le', file],
      ]);
    }
    return file;
  });
  const audioList = path.join(work, `${id}-audio.txt`);
  writeFileSync(audioList, audios.map((file) => `file '${path.resolve(file)}'`).join('\n'));
  return audioList;
};

/**
 * `--audio`: a speaker's whole voice track as `<out>/<id>.wav`, for `heygen.mjs --takes` to lip-sync one continuous
 * take to; it stops a second after the last spoken line, since the take's last frame holds through the tail.
 */
const speech = (id, parts) => {
  if (!lines.some((line) => line.speaker === id && line.text)) {
    return undefined;
  }
  const file = path.join(options.out, `${id}.wav`);
  const end = Math.max(...timeline.map((entry) => entry.end)) + 1;
  run(['-f', 'concat', '-safe', '0', '-i', audioParts(id, parts), '-t', end.toFixed(3), '-ac', '1', file]);
  return file;
};

const tracks = Object.keys(conversation.participants).map((id) => {
  /** `{ fixed: file }` for a line, or `{ seconds, render(seconds, file) }` for the footage that fills a gap. */
  const parts = [];
  // A single continuous take of the participant (`take-<id>.mp4`, lip-synced to their whole track) beats any stitching.
  const take = path.join(options.clips, `take-${id}.mp4`);
  let position = 0;
  let idleOffset = 0;
  let listened = 0;
  const listen = (until) => {
    const seconds = until - position;
    if (seconds > 0.01) {
      const clip = seconds >= MIN_LISTEN ? path.join(options.clips, `listen-${id}-${listened++}.mp4`) : undefined;
      const still = path.join(options.clips, `still-${id}.png`);
      if (clip) {
        plan.push({ id, clip: path.basename(clip), seconds: Number(seconds.toFixed(2)), exists: existsSync(clip) });
      }
      if (options.plan || options.audio || existsSync(take)) {
        // Only the gaps' timing is wanted: the plan lists them, and a take (or the audio a take is rendered to) fills
        // them itself.
        parts.push({ seconds });
      } else if (clip && existsSync(clip)) {
        parts.push({ seconds, render: (length, file) => listenSegment(clip, length, file) });
      } else if (!clip && existsSync(still)) {
        parts.push({ seconds, render: (length, file) => stillSegment(still, length, file) });
      } else if (idle[id]) {
        const offset = idleOffset;
        parts.push({ seconds, render: (length, file) => idleSegment(id, length, offset, file) });
        idleOffset += seconds;
      } else {
        throw new Error(
          `${id}: nothing to fill ${seconds.toFixed(1)}s from ${position.toFixed(1)}s (add ${clip ?? still})`,
        );
      }
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
      parts.push({ fixed: lines[entry.index].file });
      position = entry.end;
    });
  listen(total);
  if (options.plan) {
    return undefined;
  }
  if (options.audio) {
    return speech(id, parts);
  }

  const videos = existsSync(take)
    ? [take]
    : parts.map((part, index) => {
        if (part.fixed) {
          return part.fixed;
        }
        const file = path.join(work, `${id}-${index}.mkv`);
        const fades = (index > 0 ? 1 : 0) + (index < parts.length - 1 ? 1 : 0);
        part.render(part.seconds + fades * XFADE, file);
        return file;
      });
  const audioList = audioParts(id, parts);

  let chain = '';
  let label = '0:v';
  if (existsSync(take)) {
    // The take may stop short of the end; its last frame holds.
    chain = `[0:v]tpad=stop_mode=clone:stop_duration=${total.toFixed(2)},${video}[v];`;
    label = 'v';
  } else if (XFADE > 0) {
    let length = duration(videos[0]);
    videos.slice(1).forEach((file, index) => {
      const next = `v${index + 1}`;
      chain += `[${label}][${index + 1}:v]xfade=transition=fade:duration=${XFADE}:offset=${(length - XFADE).toFixed(3)}[${next}];`;
      label = next;
      length += duration(file) - XFADE;
    });
  } else if (videos.length > 1) {
    chain = `${videos.map((_, index) => `[${index}:v]`).join('')}concat=n=${videos.length}:v=1:a=0[v];`;
    label = 'v';
  }
  const track = path.join(options.out, `${id}.webm`);
  run([
    ...videos.flatMap((file) => ['-i', file]),
    ...['-f', 'concat', '-safe', '0', '-i', audioList],
    ...(chain ? ['-filter_complex', chain.slice(0, -1), '-map', `[${label}]`] : ['-map', '0:v']),
    ...['-map', `${videos.length}:a`, '-t', total.toFixed(3)],
    ...['-c:v', 'libvpx-vp9', '-b:v', '1500k', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1'],
    ...['-c:a', 'libopus', '-b:a', '96k', track],
  ]);
  return track;
});

if (options.plan) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}
if (options.audio) {
  console.log(JSON.stringify({ speech: tracks.filter(Boolean) }, null, 2));
  process.exit(0);
}

run([
  ...tracks.flatMap((track) => ['-i', track]),
  ...['-filter_complex', `amix=inputs=${tracks.length}:normalize=0`, '-vn', path.join(options.out, 'conversation.wav')],
]);
const gestures = placed.filter((entry) => !entry.text).map(({ speaker, start, end }) => ({ speaker, start, end }));

// `--screenshare <id>=<recording>` supplies the screen a participant shares from their `screenshare.at` (seconds after
// the lead-in); the page plays `<id>-screen.webm` as that participant's screenshare track.
const screenshares = options.screenshare.map((spec) => {
  const [id, source] = spec.split('=');
  const at = conversation.participants[id]?.screenshare?.at;
  if (at === undefined) {
    throw new Error(`--screenshare ${id}: set participants.${id}.screenshare.at in the conversation file`);
  }
  const file = `${id}-screen.webm`;
  // An ended player stops feeding its stream and the shared screen goes black, so the last frame runs to the end.
  const hold = Math.max(0, total - (leadIn + at) - duration(source)) + 1;
  run([
    ...['-i', source, '-an', '-vf', `tpad=stop_mode=clone:stop_duration=${hold.toFixed(2)},fps=25,format=yuv420p`],
    ...['-c:v', 'libvpx-vp9', '-b:v', '2000k', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1'],
    path.join(options.out, file),
  ]);
  return { speaker: id, start: leadIn + at, file };
});
writeFileSync(
  path.join(options.out, 'timeline.json'),
  JSON.stringify({ leadIn, total, lines: timeline, gestures, screenshares }, null, 2),
);
console.log(JSON.stringify({ tracks, total: Number(total.toFixed(2)) }, null, 2));
