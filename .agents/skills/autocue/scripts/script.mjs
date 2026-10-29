#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Autocue scripts: the committed, readable record of a demo, so a take can be regenerated and a showcase built
 * from it after the session that recorded it is gone.
 *
 *   # The script of a committed flow (its steps and narration), written beside it as <name>.script.md.
 *   node .agents/skills/autocue/scripts/script.mjs write --flow packages/plugins/plugin-chess/autocue/play-the-opening.mjs \
 *     [--video <url>] [--out <file.script.md>]
 *
 *   # An ad-hoc session (ops sent one by one over HTTP) turned into a committed flow, then its script.
 *   node .agents/skills/autocue/scripts/script.mjs write --ops /tmp/demo/ops.jsonl \
 *     --flow packages/plugins/plugin-foo/autocue/<name>.mjs --title 'Do the thing.' \
 *     --mdl 'packages/plugins/plugin-foo/PLUGIN.mdl test QA-1' --app 'composer-app via `moon run composer-app:serve`'
 *
 *   # A script as JSON (what the showcase generator reads).
 *   node .agents/skills/autocue/scripts/script.mjs read packages/plugins/plugin-chess/autocue/play-the-opening.script.md
 *
 * The driver appends every gesture op it serves over HTTP to `<out>/ops.jsonl`; that log is what `--ops` reads.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

/** Ops that steer the driver rather than the page; they never belong in a regenerated flow. */
export const META_OPS = new Set(['run', 'abort', 'steps', 'status', 'stop', 'screenshot', 'countdown']);

/** A caption such as `Step 2 — Play 1. e4` names its step; the numbering is the flow's, not the step's. */
const STEP_PREFIX = /^step\s+\d+\s*[—–:-]\s*/i;

/**
 * The provenance a flow's doc comment carries: its first sentence and the `@mdl` / `@app` tags.
 */
export const parseFlowHeader = (source) => {
  const comment = source.match(/\/\*\*([\s\S]*?)\*\//)?.[1] ?? '';
  const lines = comment.split('\n').map((line) => line.replace(/^\s*\*\s?/, '').trim());
  const tag = (name) =>
    lines
      .find((line) => line.startsWith(`@${name} `))
      ?.slice(name.length + 2)
      .trim();
  // The title is the whole first paragraph, since a long one wraps across comment lines.
  const start = lines.findIndex((line) => line.length > 0 && !line.startsWith('@'));
  const end = lines.findIndex((line, index) => index > start && (line.length === 0 || line.startsWith('@')));
  const title = start < 0 ? undefined : lines.slice(start, end < 0 ? undefined : end).join(' ');
  return { title, mdl: tag('mdl'), app: tag('app') };
};

const quote = (value) => JSON.stringify(String(value));

// Single-quoted, as the repo's formatter rewrites frontmatter; a committed script then stays byte-stable.
const yamlQuote = (value) => `'${String(value).replace(/\s+/g, ' ').replaceAll("'", "''")}'`;

const yamlUnquote = (raw) => {
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replaceAll("''", "'");
  }
  return raw.startsWith('"') ? JSON.parse(raw) : raw;
};

/**
 * Renders a script as markdown: frontmatter with the flow, the spec test, the app and the published video, then the
 * on-camera steps, each followed by its narration when that differs from its name.
 */
export const renderScript = ({ title, flow, mdl, app, video, steps }) => {
  const frontmatter = [
    ['flow', flow],
    ['mdl', mdl],
    ['app', app],
    ['video', video],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${yamlQuote(value)}`);
  const setup = steps.filter((step) => step.setup);
  const onCamera = steps.filter((step) => !step.setup);
  const item = (step, index) => {
    const head = `${index + 1}. ${step.name}`;
    const narration = step.narration && step.narration !== step.name ? `\n\n   ${step.narration}` : '';
    return head + narration;
  };
  return [
    '---',
    ...frontmatter,
    '---',
    '',
    `# ${title ?? 'Untitled demo'}`,
    '',
    'Regenerate the take by running the flow with the `autocue` skill; edit the flow, then re-run `script.mjs write`.',
    '',
    ...(setup.length > 0 ? ['## Setup', '', ...setup.map(item), ''] : []),
    '## Steps',
    '',
    onCamera.length > 0 ? onCamera.map(item).join('\n') : '_No on-camera steps._',
    '',
  ].join('\n');
};

/**
 * Reads a script back: its frontmatter fields, title, and steps (setup steps flagged).
 */
export const parseScript = (markdown) => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  const fields = {};
  for (const line of (match?.[1] ?? '').split('\n')) {
    const field = line.match(/^(\w+):\s*(.*)$/);
    if (field) {
      const [, key, raw] = field;
      fields[key] = yamlUnquote(raw.trim());
    }
  }
  const body = match ? markdown.slice(match[0].length) : markdown;
  const title = body.match(/^# (.+)$/m)?.[1].trim();
  const steps = [];
  let section;
  for (const line of body.split('\n')) {
    const heading = line.match(/^## (.+)$/);
    if (heading) {
      section = heading[1].trim().toLowerCase();
      continue;
    }
    const step = line.match(/^\d+\.\s+(.+)$/);
    if (step && (section === 'steps' || section === 'setup')) {
      steps.push({ name: step[1].trim(), narration: step[1].trim(), setup: section === 'setup' });
    } else if (/^\s{3,}\S/.test(line) && steps.length > 0) {
      const last = steps[steps.length - 1];
      last.narration = last.narration === last.name ? line.trim() : `${last.narration} ${line.trim()}`;
    }
  }
  return { ...fields, title, steps };
};

/**
 * Turns a driver op log into a flow script: the ops before the first caption become one setup step, and each
 * caption opens a step named after it, so the regenerated take keeps the captions the session showed.
 */
export const flowFromOps = ({ title, mdl, app, ops }) => {
  const steps = [];
  let current = { name: 'Set up', setup: true, ops: [] };
  for (const { op, ...args } of ops) {
    if (META_OPS.has(op)) {
      continue;
    }
    if (op === 'caption' && args.value) {
      if (current.ops.length > 0 || !current.setup) {
        steps.push(current);
      }
      const name = String(args.value).replace(STEP_PREFIX, '');
      current = { name, narration: String(args.value), ops: [] };
    }
    current.ops.push({ op, args });
  }
  if (current.ops.length > 0 || !current.setup) {
    steps.push(current);
  }

  const renderStep = (step) =>
    [
      '  {',
      `    name: ${quote(step.name)},`,
      ...(step.setup ? ['    setup: true,'] : []),
      ...(step.narration && step.narration !== step.name ? [`    narration: ${quote(step.narration)},`] : []),
      '    run: async ({ demo }) => {',
      ...step.ops.map(({ op, args }) => `      await demo.${op}(${JSON.stringify(args)});`),
      '    },',
      '  },',
    ].join('\n');

  return [
    '//',
    `// Copyright ${new Date().getFullYear()} DXOS.org`,
    '//',
    '',
    '/**',
    ` * ${title ?? 'Untitled demo.'}`,
    ' *',
    ` * @mdl ${mdl ?? 'TODO: the .mdl test this flow walks'}`,
    ` * @app ${app ?? 'TODO: how to serve the app'}`,
    ' *',
    ' * Regenerated from an ad-hoc driver session by `.agents/skills/autocue/scripts/script.mjs`; replace probes',
    ' * (`eval`, `text`, `count`) with waits on what each step should show before committing.',
    ' */',
    '',
    'export const steps = [',
    ...steps.map(renderStep),
    '];',
    '',
  ].join('\n');
};

/** Reads `ops.jsonl`, skipping blank and malformed lines (a killed driver can leave half a line). */
export const readOps = (file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });

const repoRelative = (file) => path.relative(process.cwd(), path.resolve(file)).split(path.sep).join('/');

/** A committed flow's script: the steps its module exports, and the provenance in its doc comment. */
export const scriptFromFlow = async (flow, { video } = {}) => {
  const source = readFileSync(flow, 'utf8');
  const header = parseFlowHeader(source);
  const module = await import(pathToFileURL(path.resolve(flow)).href);
  const steps = (module.steps ?? []).map(({ name, narration, setup }) => ({ name, narration, setup: !!setup }));
  return { ...header, flow: repoRelative(flow), video, steps };
};

const main = async () => {
  const [command, ...rest] = process.argv.slice(2);
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      flow: { type: 'string' },
      ops: { type: 'string' },
      out: { type: 'string' },
      video: { type: 'string' },
      title: { type: 'string' },
      mdl: { type: 'string' },
      app: { type: 'string' },
    },
  });

  if (command === 'read') {
    const file = positionals[0];
    if (!file) {
      throw new Error('usage: script.mjs read <file.script.md>');
    }
    console.log(JSON.stringify(parseScript(readFileSync(file, 'utf8')), null, 2));
    return;
  }

  if (command === 'write') {
    if (!values.flow) {
      throw new Error('usage: script.mjs write --flow <flow.mjs> [--ops <ops.jsonl>] [--video <url>] [--out <file>]');
    }
    if (values.ops) {
      // An existing flow is the reviewed one; regenerating over it would drop every fix made since.
      if (existsSync(values.flow)) {
        throw new Error(`${values.flow} exists; pass a new path, or delete it first to regenerate it.`);
      }
      mkdirSync(path.dirname(values.flow), { recursive: true });
      writeFileSync(
        values.flow,
        flowFromOps({ title: values.title, mdl: values.mdl, app: values.app, ops: readOps(values.ops) }),
      );
      console.log(`flow ${values.flow}`);
    }
    const script = await scriptFromFlow(values.flow, { video: values.video });
    const out = values.out ?? values.flow.replace(/\.m?js$/, '.script.md');
    writeFileSync(out, renderScript(script));
    console.log(`script ${out} (${script.steps.filter((step) => !step.setup).length} on-camera steps)`);
    return;
  }

  throw new Error('usage: script.mjs <write|read> …');
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
