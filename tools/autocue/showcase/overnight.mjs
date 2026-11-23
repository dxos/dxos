#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Records every showcase flow (`packages/{apps,plugins}/<pkg>/autocue/showcase.mjs`) unattended, in each variant
 * `--themes` names, and writes REPORT.md + report.json, so a night's run can be read in the morning and the failing flows fixed:
 *
 * - light: the showcase clip — 60 fps, no captions or ident, the `clip: <name>` step cut to the flow's `CLIP_MS`.
 * - dark: the demo — 30 fps, captions, the whole take trimmed of dead air and bookended by the Composer ident.
 * - clip-dark: the light clip recorded in the dark theme, for a dark grid (`--themes clip-dark`).
 *
 * A failed take is retried, then logged and skipped; it never ends the run.
 *
 *   node tools/autocue/showcase/overnight.mjs [--only map,chess] [--themes light,dark] [--out temp/showcase/run]
 *     [--retries 1] [--no-serve] [--publish] [--no-composite] [--storybook http://localhost:9009] [--grid-min 3]
 *
 * `--grid-min` is the closest a clip may repeat in the grid; a subset run (`--only`) has too few clips for 3, so lower it.
 *
 * After the flows, the first clip variant's clips are laid out as the grid (`layout.mjs`) and the Grid composite is
 * rendered to `<out>/composite.mp4` (and `temp/composite/composite.mp4`) by `render.mjs`, from a storybook scoped to
 * `tools/autocue` on :9009 that the runner starts if nothing answers there and stops afterwards.
 *
 * `--publish` uploads each flow's light and dark videos once both pass and sets them as the plugin's showcase entry in
 * its `dx.config.ts` `screenshots` (`publish.mjs`, whose header has the one-approval command that caches the R2 keys
 * in `.secrets/r2.env`). A run recorded without `--publish` is published later with `publish.mjs --run <out>`.
 *
 * Composer must answer on :4173; without `--no-serve` the runner starts it if it does not, and stops it at the end.
 * Recording rules: docs/SHOWCASE.md.
 */

import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { publishFlow, r2Keys } from './publish.mjs';
import { storybook } from './storybook.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execFileSync('git', ['-C', HERE, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const URL = 'http://localhost:4173';

const { values: options } = parseArgs({
  options: {
    'only': { type: 'string' },
    'themes': { type: 'string', default: 'light,dark' },
    'out': { type: 'string' },
    'retries': { type: 'string', default: '1' },
    'no-serve': { type: 'boolean', default: false },
    'publish': { type: 'boolean', default: false },
    'no-composite': { type: 'boolean', default: false },
    'grid-min': { type: 'string', default: '3' },
    'storybook': { type: 'string', default: 'http://localhost:9009' },
    'port': { type: 'string', default: '7400' },
  },
});

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const OUT = path.resolve(ROOT, options.out ?? `temp/showcase/${stamp}`);
const CLIPS = path.join(OUT, 'clips');
const THEMES = options.themes.split(',').map((theme) => theme.trim());
for (const theme of THEMES) {
  mkdirSync(path.join(CLIPS, theme), { recursive: true });
}

/** How each variant is recorded (`run.sh` reads these) and finished. */
const VARIANTS = {
  'light': { THEME: 'light', FPS: '60', CAPTIONS: 'off' },
  'dark': { THEME: 'dark', FPS: '30', CAPTIONS: 'on' },
  'clip-dark': { THEME: 'dark', FPS: '60', CAPTIONS: 'off' },
};

/** Variants recorded as bare clips for the Grid grid, rather than bookended demos. */
const isClip = (theme) => VARIANTS[theme].CAPTIONS === 'off';

// run.sh calls `node`; the runner's own Node (24, for the driver's dependencies) goes first on PATH.
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` };

const log = (line) => console.log(`[overnight ${new Date().toISOString().slice(11, 19)}] ${line}`);

/** Every showcase flow, sorted by package. */
const discover = () =>
  ['packages/apps', 'packages/plugins']
    .flatMap((dir) =>
      readdirSync(path.join(ROOT, dir)).map((pkg) => path.join(ROOT, dir, pkg, 'autocue', 'showcase.mjs')),
    )
    .filter((file) => existsSync(file))
    .sort();

const up = async () => {
  try {
    const response = await fetch(URL, { signal: AbortSignal.timeout(5_000) });
    return response.ok;
  } catch {
    return false;
  }
};

/** Starts Composer on :4173 and waits for it; the first build of a fresh worktree takes minutes. */
const serve = async () => {
  log('Composer is not answering on :4173; starting it');
  const server = spawn('moon', ['run', 'composer-app:serve', '--', '--port', '4173', '--strictPort'], {
    cwd: ROOT,
    env: { ...env, DX_PWA: 'false' },
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true,
  });
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    if (await up()) {
      log('Composer is up');
      return server;
    }
    if (server.exitCode !== null) {
      throw new Error(`composer-app:serve exited with ${server.exitCode}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  // The server runs in its own process group; left behind, it would hold :4173 for the next run.
  process.kill(-server.pid, 'SIGTERM');
  throw new Error('Composer did not answer on :4173 within 20 minutes');
};

const run = (command, args, opts = {}) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, env, ...opts });
    let output = '';
    child.stdout?.on('data', (chunk) => (output += chunk));
    child.stderr?.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => resolve({ code, output }));
  });

/** Records one take and returns each step's result, parsed from run.sh's `<n> ok|ERR <name> <error>` lines. */
const record = async (file, take, port, theme) => {
  const { output } = await run('bash', [path.join(HERE, 'run.sh'), file, take, String(port)], {
    env: { ...env, ...VARIANTS[theme] },
  });
  const steps = [...output.matchAll(/^(\d+) (ok |ERR) (.*)$/gm)].map(([, index, status, rest]) => ({
    index: Number(index),
    ok: status.trim() === 'ok',
    text: rest.trim(),
  }));
  const video = path.join(take, 'session.webm');
  const failed = steps.find((step) => !step.ok);
  const ok = steps.length > 0 && !failed && existsSync(video);
  const error = failed?.text ?? (ok ? undefined : output.split('\n').filter(Boolean).slice(-3).join(' | '));
  return { ok, error };
};

/**
 * The dark demo's source: the take from its `clip:` step on, with the timeline shifted to match. The setup before it
 * is preparation (a template space, a closed companion), and showing it would put a companion's open-and-close on
 * camera. Falls back to the whole take when the cut fails, so a demo is still made.
 */
const demoCut = async (take, name) => {
  const timelineFile = path.join(take, 'timeline.json');
  const timeline = JSON.parse(readFileSync(timelineFile, 'utf8'));
  const start = timeline.steps?.find((step) => step.text === `clip: ${name}`)?.ms;
  if (start === undefined) {
    return path.join(take, 'session.webm');
  }
  const dir = path.join(take, 'demo');
  mkdirSync(dir, { recursive: true });
  const cut = await run('ffmpeg', [
    ...['-v', 'error', '-y', '-ss', String(start / 1000), '-i', path.join(take, 'session.webm')],
    ...['-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8'],
    ...['-crf', '30', '-b:v', '0', '-an', path.join(dir, 'session.webm')],
  ]);
  if (cut.code !== 0) {
    return path.join(take, 'session.webm');
  }
  const steps = (timeline.steps ?? [])
    .filter((step) => step.ms >= start - 50)
    .map((step) => ({ ...step, ms: Math.max(0, step.ms - start) }));
  writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify({ ...timeline, steps }, null, 2));
  return path.join(dir, 'session.webm');
};

/** Turns a take into its variant's video: the cut clip (light, clip-dark) or the trimmed, bookended demo (dark). */
const finish = async (theme, take, name, ms) => {
  const out = path.join(CLIPS, theme, `${name}.mp4`);
  const done = isClip(theme)
    ? await run('bash', [
        path.join(HERE, 'cutstep.sh'),
        take,
        path.join(CLIPS, theme),
        `clip: ${name}`,
        name,
        '0',
        String(ms / 1000),
      ])
    : await run(process.execPath, [
        path.join(ROOT, '.agents/skills/autocue/scripts/trim-static.mjs'),
        ...['--in', await demoCut(take, name), '--out', path.join(CLIPS, theme, `${name}.webm`)],
        ...['--ident', 'composer', '--theme', 'dark', '--mp4', '--fps', '30', '--duration', 'off', '--upload', 'off'],
      ]);
  if (done.code !== 0 || !existsSync(out)) {
    return {
      ok: false,
      error: `${isClip(theme) ? 'cut' : 'trim'} failed: ${done.output.trim().split('\n').pop()}`,
    };
  }
  // A step can pass on a blank plank, so each video gets frames a person can check in the morning.
  const frames = path.join(CLIPS, theme, `${name}.png`);
  // A probe that fails or reports no duration skips the frame sheet; it never ends the night's run.
  let seconds = Number.NaN;
  try {
    seconds = Number(
      execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], {
        encoding: 'utf8',
      }),
    );
  } catch {}
  const probed = Number.isFinite(seconds) && seconds > 0;
  if (probed) {
    await run('ffmpeg', [
      ...['-v', 'error', '-y', '-i', out],
      ...['-vf', `fps=4/${seconds},scale=480:-1,tile=4x1`, '-frames:v', '1', frames],
    ]);
  }
  return {
    ok: true,
    video: path.relative(ROOT, out),
    seconds: probed ? Math.round(seconds) : undefined,
    frames: probed && existsSync(frames) ? path.relative(OUT, frames) : undefined,
  };
};

const flows = discover().filter((file) => {
  if (!options.only) {
    return true;
  }
  const pkg = path.basename(path.dirname(path.dirname(file))).replace(/^plugin-/, '');
  return options.only.split(',').some((name) => name.trim() === pkg || name.trim() === `plugin-${pkg}`);
});

const keys = options.publish ? r2Keys(env) : undefined;
if (options.publish && !keys) {
  console.error('--publish needs R2 keys: fill .secrets/r2.env with the command in publish.mjs (see its header)');
  process.exit(2);
}
if (options.publish && !(THEMES.includes('light') && THEMES.includes('dark'))) {
  console.error('--publish sets light and dark together; drop --themes');
  process.exit(2);
}

log(`${flows.length} flows → ${path.relative(ROOT, OUT)}`);
const server = !(await up()) && !options['no-serve'] ? await serve() : undefined;
if (!(await up())) {
  console.error('Composer is not answering on http://localhost:4173; start it or drop --no-serve');
  process.exit(1);
}

const started = Date.now();
const results = [];
for (const [index, file] of flows.entries()) {
  let module;
  try {
    module = await import(pathToFileURL(file).href);
    if (!Array.isArray(module.steps)) {
      throw new Error('exports no `steps` array');
    }
  } catch (error) {
    // A flow that does not load is one failed row, not the end of the night's run.
    const name = path.basename(path.dirname(path.dirname(file)));
    log(`${name}: FAILED to load — ${error.message}`);
    results.push({ name, theme: '—', flow: path.relative(ROOT, file), attempts: 0, ok: false, error: error.message });
    continue;
  }
  const clipStep = module.steps.find((step) => step.name.startsWith('clip: '));
  const name = clipStep?.name.slice('clip: '.length) ?? path.basename(path.dirname(path.dirname(file)));
  const ms = module.CLIP_MS ?? 10_000;
  for (const [variant, theme] of THEMES.entries()) {
    const port = Number(options.port) + index * THEMES.length + variant;
    const result = { name, theme, flow: path.relative(ROOT, file), attempts: 0 };
    for (let attempt = 0; attempt <= Number(options.retries); attempt++) {
      result.attempts = attempt + 1;
      const take = path.join(OUT, 'takes', `${name}-${theme}`);
      log(`${index + 1}/${flows.length} ${name} ${theme}, attempt ${attempt + 1}`);
      Object.assign(result, await record(file, take, port, theme), { take: path.relative(ROOT, take) });
      if (result.ok) {
        Object.assign(result, await finish(theme, take, name, ms));
      }
      if (result.ok) {
        result.error = undefined;
        break;
      }
    }
    log(`${name} ${theme}: ${result.ok ? 'ok' : `FAILED — ${result.error}`}`);
    results.push(result);
    writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  }
  const variants = Object.fromEntries(
    results.filter((result) => result.flow === path.relative(ROOT, file)).map((result) => [result.theme, result]),
  );
  if (options.publish && variants.light?.ok && variants.dark?.ok) {
    const outcome = await publishFlow(
      path.relative(ROOT, file),
      { light: variants.light.video, dark: variants.dark.video },
      keys,
    );
    log(`${name}: published → ${outcome.published}`);
    Object.assign(variants.dark, outcome);
    writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  }
}

// The clips become the Grid grid, placed so no clip repeats near itself; a failure here is reported, not fatal.
const gridVariant = THEMES.find(isClip);
const layout = gridVariant
  ? await run(process.execPath, [
      path.join(HERE, 'layout.mjs'),
      ...['--run', path.relative(ROOT, OUT), '--min', options['grid-min'], '--variant', gridVariant],
    ])
  : undefined;

// The composite is rendered only from a grid that laid out cleanly, so a run never renders over a stale grid.
let composite;
if (layout?.code === 0 && !options['no-composite']) {
  const book = await storybook({ root: ROOT, url: options.storybook, env, log });
  if (!book.ok) {
    composite = { error: `no storybook answered on ${options.storybook}` };
  } else {
    log('rendering the composite');
    const out = path.join(OUT, 'composite.mp4');
    // A cold storybook can reload the story mid-render (Vite re-optimizing dependencies); the retry finds it warm.
    let render;
    for (let attempt = 0; attempt < 2 && !(render?.code === 0 && existsSync(out)); attempt++) {
      render = await run(process.execPath, [
        path.join(HERE, 'render.mjs'),
        ...['--out', out, '--fps', '60', '--theme', VARIANTS[gridVariant].THEME, '--url', options.storybook],
      ]);
    }
    if (render.code === 0 && existsSync(out)) {
      mkdirSync(path.join(ROOT, 'temp/composite'), { recursive: true });
      copyFileSync(out, path.join(ROOT, 'temp/composite/composite.mp4'));
      const frames = path.join(OUT, 'composite.png');
      await run('ffmpeg', [
        '-v',
        'error',
        '-y',
        '-i',
        out,
        '-vf',
        'fps=1/6,scale=480:-1,tile=4x2',
        '-frames:v',
        '1',
        frames,
      ]);
      composite = {
        video: path.relative(OUT, out),
        frames: existsSync(frames) ? path.relative(OUT, frames) : undefined,
      };
    } else {
      composite = { error: render.output.trim().split('\n').slice(-2).join(' | ') };
    }
    book.stop?.();
  }
  log(`composite: ${composite.video ?? composite.error}`);
}

const minutes = ((Date.now() - started) / 60_000).toFixed(1);
const passed = results.filter((result) => result.ok).length;
const rows = results.map(
  (result) =>
    `| ${result.name} | ${result.theme} | ${result.seconds ? `${result.seconds}s` : '—'} | ${
      result.ok ? 'ok' : 'FAILED'
    } | ${result.attempts} | ${result.video ? `\`${result.video}\`` : '—'} | ${result.published ?? '—'} | ${(
      result.error ?? ''
    )
      .replace(/\|/g, '\\|')
      .slice(0, 160)} | \`${result.flow}\` |`,
);
// One entry per flow, light then dark, with a Notes checklist for review.
const frames = [...new Set(results.map((result) => result.name))].flatMap((name) => {
  const rows = results.filter((result) => result.name === name);
  const images = rows.filter((result) => result.frames).map((result) => `![${name} ${result.theme}](${result.frames})`);
  const error = rows.find((result) => result.error)?.error ?? 'no frames';
  return [`### ${name}`, '', ...(images.length > 0 ? images : [`_No frames: ${error}_`]), '', 'Notes', '', '- [ ]', ''];
});
writeFileSync(
  path.join(OUT, 'REPORT.md'),
  [
    `# Showcase run ${stamp}`,
    '',
    `${passed}/${results.length} videos passed in ${minutes} min. Takes, step screenshots and app logs are under \`takes/<name>-<theme>\`.`,
    '',
    '| Clip | Theme | Length | Result | Attempts | Video | Published | Error | Flow |',
    '| ---- | ----- | ------ | ------ | -------- | ----- | --------- | ----- | ---- |',
    ...rows,
    '',
    ...(layout
      ? [
          '## Grid',
          '',
          `\`layout.mjs\` ${layout.code === 0 ? 'laid out' : 'could not lay out'} \`temp/grid-zoom\` (\`*\` marks a tour cell):`,
          '',
          '```',
          layout.output.trim(),
          '```',
          '',
        ]
      : []),
    ...(composite
      ? [
          '## Composite',
          '',
          composite.video
            ? `\`${composite.video}\` (also \`temp/composite/composite.mp4\`), a frame every 6s:`
            : `Not rendered: ${composite.error}`,
          '',
          ...(composite.frames ? [`![composite](${composite.frames})`, ''] : []),
        ]
      : []),
    '## Frames',
    '',
    'Four frames from each video, evenly spaced: check each shows its plugin working, not a blank or wrong plank.',
    '',
    ...frames,
  ].join('\n'),
);
log(
  `${passed}/${results.length} passed in ${minutes} min; report: ${path.relative(ROOT, path.join(OUT, 'REPORT.md'))}`,
);

if (server) {
  process.kill(-server.pid, 'SIGTERM');
}
process.exit(passed === results.length ? 0 : 1);
