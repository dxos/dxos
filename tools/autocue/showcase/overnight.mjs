#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Records every showcase flow (`packages/{apps,plugins}/<pkg>/autocue/showcase.mjs`) unattended, cuts each flow's
 * `clip: <name>` step to its `CLIP_MS`, and writes REPORT.md + report.json, so a night's run can be read in the
 * morning and the failing flows fixed. A failed flow is retried, then logged and skipped; it never ends the run.
 *
 *   node tools/autocue/showcase/overnight.mjs [--only map,chess] [--out temp/showcase/run] [--retries 1] [--no-serve]
 *
 * Composer must answer on :4173; without `--no-serve` the runner starts it if it does not, and stops it at the end.
 * Recording rules (light, 60 fps, no ident, captions or count-in): GridZoom/SHOWCASE.md.
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execFileSync('git', ['-C', HERE, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const URL = 'http://localhost:4173';

const { values: options } = parseArgs({
  options: {
    'only': { type: 'string' },
    'out': { type: 'string' },
    'retries': { type: 'string', default: '1' },
    'no-serve': { type: 'boolean', default: false },
    'port': { type: 'string', default: '7400' },
  },
});

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const OUT = path.resolve(ROOT, options.out ?? `temp/showcase/${stamp}`);
const CLIPS = path.join(OUT, 'clips');
mkdirSync(CLIPS, { recursive: true });

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
const record = async (file, take, port) => {
  const { output } = await run('bash', [path.join(HERE, 'run.sh'), file, take, String(port)]);
  const steps = [...output.matchAll(/^(\d+) (ok |ERR) (.*)$/gm)].map(([, index, status, rest]) => ({
    index: Number(index),
    ok: status.trim() === 'ok',
    text: rest.trim(),
  }));
  const video = path.join(take, 'session.webm');
  const failed = steps.find((step) => !step.ok);
  const ok = steps.length > 0 && !failed && existsSync(video);
  const error = failed?.text ?? (ok ? undefined : output.split('\n').filter(Boolean).slice(-3).join(' | '));
  return { ok, steps, error };
};

const flows = discover().filter((file) => {
  if (!options.only) {
    return true;
  }
  const pkg = path.basename(path.dirname(path.dirname(file))).replace(/^plugin-/, '');
  return options.only.split(',').some((name) => name.trim() === pkg || name.trim() === `plugin-${pkg}`);
});

log(`${flows.length} flows → ${path.relative(ROOT, OUT)}`);
const server = !(await up()) && !options['no-serve'] ? await serve() : undefined;
if (!(await up())) {
  console.error('Composer is not answering on http://localhost:4173; start it or drop --no-serve');
  process.exit(1);
}

const started = Date.now();
const results = [];
for (const [index, file] of flows.entries()) {
  const module = await import(pathToFileURL(file).href);
  const clipStep = module.steps.find((step) => step.name.startsWith('clip: '));
  const name = clipStep?.name.slice('clip: '.length) ?? path.basename(path.dirname(path.dirname(file)));
  const ms = module.CLIP_MS ?? 10_000;
  const port = Number(options.port) + index;
  const result = { name, flow: path.relative(ROOT, file), seconds: ms / 1000, attempts: 0 };
  for (let attempt = 0; attempt <= Number(options.retries); attempt++) {
    result.attempts = attempt + 1;
    const take = path.join(OUT, 'takes', name);
    log(`${index + 1}/${flows.length} ${name} (${ms / 1000}s), attempt ${attempt + 1}`);
    Object.assign(result, await record(file, take, port), { take: path.relative(ROOT, take) });
    if (result.ok) {
      const cut = await run('bash', [
        path.join(HERE, 'cutstep.sh'),
        take,
        CLIPS,
        `clip: ${name}`,
        name,
        '0',
        String(ms / 1000),
      ]);
      result.clip = cut.code === 0 ? path.relative(ROOT, path.join(CLIPS, `${name}.mp4`)) : undefined;
      result.error = cut.code === 0 ? undefined : `cut failed: ${cut.output.trim().split('\n').pop()}`;
      result.ok = cut.code === 0;
      if (result.ok) {
        // A step can pass on a blank plank, so each clip gets frames a person can check in the morning.
        const frames = path.join(CLIPS, `${name}.png`);
        await run('ffmpeg', [
          ...['-v', 'error', '-y', '-i', path.join(CLIPS, `${name}.mp4`)],
          ...['-vf', `fps=4/${ms / 1000},scale=480:-1,tile=4x1`, '-frames:v', '1', frames],
        ]);
        result.frames = existsSync(frames) ? path.relative(OUT, frames) : undefined;
      }
    }
    if (result.ok) {
      break;
    }
  }
  log(`${name}: ${result.ok ? 'ok' : `FAILED — ${result.error}`}`);
  results.push(result);
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
}

const minutes = ((Date.now() - started) / 60_000).toFixed(1);
const passed = results.filter((result) => result.ok).length;
const rows = results.map(
  (result) =>
    `| ${result.name} | ${result.seconds}s | ${result.ok ? 'ok' : 'FAILED'} | ${result.attempts} | ${
      result.clip ? `\`${result.clip}\`` : '—'
    } | ${(result.error ?? '').replace(/\|/g, '\\|').slice(0, 160)} | \`${result.flow}\` |`,
);
const frames = results
  .filter((result) => result.frames)
  .flatMap((result) => [`### ${result.name}`, '', `![${result.name}](${result.frames})`, '']);
writeFileSync(
  path.join(OUT, 'REPORT.md'),
  [
    `# Showcase run ${stamp}`,
    '',
    `${passed}/${results.length} flows passed in ${minutes} min. Takes, step screenshots and app logs are under \`takes/<name>\`.`,
    '',
    '| Clip | Length | Result | Attempts | Clip file | Error | Flow |',
    '| ---- | ------ | ------ | -------- | --------- | ----- | ---- |',
    ...rows,
    '',
    '## Frames',
    '',
    'Four frames from each clip, evenly spaced: check each shows its plugin working, not a blank or wrong plank.',
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
