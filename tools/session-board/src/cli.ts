#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Turns a session board's Markdown into a single-file react-ui page, without a bundler.
//
//   cli.ts start <board.md>              # make <board.md> the session's board (writes it from a skeleton if absent)
//   cli.ts build [<board.md>] [--strict] # parse, check, and write the page; exit 1 on an error
//   cli.ts hook                          # the Stop hook: build the current board; block once per change
//   cli.ts template build | push | pull  # the prebuilt page: build it with Vite, or move it through R2
//
// The page is prebuilt once (`template build`, or `template pull` from R2) and only filled here, so a build takes
// well under a second and can run on every Stop.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Problem, type Sentence, parseBoard } from './parse.ts';
import { type BoardData } from './types.ts';

const PACKAGE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PACKAGE, '../..');
const STATE_DIR = join(ROOT, '.claude/.status-board');
const CURRENT = join(STATE_DIR, 'current');
const LOCAL_TEMPLATE = join(PACKAGE, 'dist/app/index.html');
const CACHED_TEMPLATE = join(homedir(), '.cache/dxos-session-board/template.html');
const STE_CHECK = join(ROOT, '.agents/skills/simplified-technical-english/scripts/ste_check.py');
const UPLOAD = join(ROOT, '.agents/skills/hosting-artifacts/scripts/upload-artifact.mjs');
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE || 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev';
const R2_PREFIX = 'session-board';
const TEMPLATE_SOURCES = ['app', 'src'];

const SKELETON = `# Session title
One line that says what this session is for.

## Questions

## Goals
- [doing] Write the first goal here.

## Pull requests
`;

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const git = (...args: string[]): string | undefined => {
  try {
    return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
};

const newest = (dir: string): number =>
  readdirSync(dir, { withFileTypes: true }).reduce((latest, entry) => {
    const file = join(dir, entry.name);
    return Math.max(latest, entry.isDirectory() ? newest(file) : statSync(file).mtimeMs);
  }, 0);

const isLocalTemplateFresh = (): boolean =>
  existsSync(LOCAL_TEMPLATE) &&
  Math.max(...TEMPLATE_SOURCES.map((dir) => newest(join(PACKAGE, dir)))) <= statSync(LOCAL_TEMPLATE).mtimeMs;

/** Downloads the newest prebuilt page of `ref` from R2 into the local cache. */
const pullTemplate = async (ref = 'main'): Promise<string> => {
  // The pointer is overwritten in place, so the query keeps an intermediate cache from serving an old one.
  const pointer = await fetch(`${PUBLIC_BASE}/${R2_PREFIX}/refs/${ref}.json?t=${Date.now()}`);
  if (!pointer.ok) {
    return fail(`no prebuilt page for ${ref} in R2 (${pointer.status}); run \`cli.ts template build\``);
  }
  const { url, commit }: { url: string; commit: string } = await pointer.json();
  const page = await fetch(url);
  if (!page.ok) {
    return fail(`${url}: ${page.status}`);
  }
  mkdirSync(dirname(CACHED_TEMPLATE), { recursive: true });
  writeFileSync(CACHED_TEMPLATE, await page.text());
  console.error(`template: build of ${commit.slice(0, 10)} (${ref}) in ${CACHED_TEMPLATE}`);
  return CACHED_TEMPLATE;
};

/** The prebuilt page: a fresh local build, else the cached R2 copy, else a fresh pull. */
const resolveTemplate = async (): Promise<string> => {
  if (isLocalTemplateFresh()) {
    return LOCAL_TEMPLATE;
  }
  if (existsSync(CACHED_TEMPLATE)) {
    return CACHED_TEMPLATE;
  }
  if (existsSync(LOCAL_TEMPLATE)) {
    console.error('template: the local build is older than its sources; run `cli.ts template build` to refresh it');
    return LOCAL_TEMPLATE;
  }
  return pullTemplate();
};

const buildTemplate = (): void => {
  const result = spawnSync('pnpm', ['exec', 'vite', 'build', '--config', 'app/vite.config.ts', '--logLevel', 'error'], {
    cwd: PACKAGE,
    stdio: 'inherit',
  });
  if (result.status !== 0 || !existsSync(LOCAL_TEMPLATE)) {
    fail(
      'the page build failed; its dependencies need `moon run vite-plugin-import-source:build ui-theme:build lit-ui:build`',
    );
  }
  console.log(LOCAL_TEMPLATE);
};

const pushTemplate = (ref: string): void => {
  if (!isLocalTemplateFresh()) {
    fail('the local page build is missing or stale; run `cli.ts template build` first');
  }
  const commit = git('rev-parse', 'HEAD') ?? fail('not in a git checkout');
  const key = `${R2_PREFIX}/builds/${commit}.html`;
  execFileSync('node', [UPLOAD, LOCAL_TEMPLATE, '--key', key], { stdio: 'inherit' });
  const pointer = join(tmpdir(), `session-board-${process.pid}.json`);
  writeFileSync(
    pointer,
    JSON.stringify({ commit, ref, url: `${PUBLIC_BASE}/${key}`, builtAt: new Date().toISOString() }),
  );
  execFileSync('node', [UPLOAD, pointer, '--key', `${R2_PREFIX}/refs/${ref}.json`], { stdio: 'inherit' });
};

/** Every `<` as a JSON escape, so neither `</script>` nor `<!--` in the board can end the element early. */
const embed = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c');
const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** STE findings for the board's lines; the checker reads paragraphs, so each line is one. */
const checkSte = (sentences: Sentence[]): Problem[] => {
  const lines = sentences.filter((sentence) => /[a-z]/i.test(sentence.text));
  if (lines.length === 0 || !existsSync(STE_CHECK)) {
    return [];
  }
  const result = spawnSync('python3', [STE_CHECK, '--no-vocab'], {
    input: lines.map((sentence) => sentence.text).join('\n\n'),
    encoding: 'utf8',
  });
  const problems: Problem[] = [];
  for (const match of (result.stdout ?? '').matchAll(/^(ERROR|WARNING)\s+stdin:par(\d+)\s+(.*)$/gm)) {
    const sentence = lines[Number(match[2]) - 1];
    if (sentence) {
      problems.push({ line: sentence.line, message: `STE ${match[1].toLowerCase()}: ${match[3]}` });
    }
  }
  return problems;
};

/** The board's content without its build time, so an unchanged board hashes the same on every build. */
const contentHash = (board: BoardData): string =>
  createHash('sha256')
    .update(JSON.stringify({ ...board, updated: undefined }))
    .digest('hex')
    .slice(0, 16);

type BuildResult = {
  source: string;
  page?: string;
  hash?: string;
  errors: Problem[];
  warnings: Problem[];
};

const pagePath = (source: string) => join(STATE_DIR, `${basename(source, '.md')}.html`);

const build = async (source: string, strict: boolean): Promise<BuildResult> => {
  const text = readFileSync(source, 'utf8');
  const { board, errors, sentences } = parseBoard(text, {
    branch: git('branch', '--show-current'),
    source: relative(ROOT, source),
  });
  const ste = checkSte(sentences);
  const warnings = strict ? [] : ste;
  if (strict) {
    errors.push(...ste);
  }
  if (!board || errors.length > 0) {
    return { source, errors, warnings };
  }
  const template = readFileSync(await resolveTemplate(), 'utf8');
  if (!template.includes('{{BOARD}}')) {
    fail('the page template has no {{BOARD}} placeholder; rebuild it');
  }
  const page = pagePath(source);
  mkdirSync(dirname(page), { recursive: true });
  writeFileSync(
    page,
    template.replace('{{TITLE}}', () => escapeHtml(board.title)).replace('{{BOARD}}', () => embed(board)),
  );
  return { source, page, hash: contentHash(board), errors, warnings };
};

const format = (source: string, problems: Problem[]) =>
  problems
    .sort((left, right) => left.line - right.line)
    .map((problem) => `${relative(ROOT, source)}:${problem.line}: ${problem.message}`)
    .join('\n');

const currentSource = (): string | undefined => {
  if (!existsSync(CURRENT)) {
    return undefined;
  }
  const source = resolve(ROOT, readFileSync(CURRENT, 'utf8').trim());
  return existsSync(source) ? source : undefined;
};

const start = (source: string) => {
  const absolute = resolve(source);
  if (!existsSync(absolute)) {
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, SKELETON);
    console.log(`wrote ${relative(ROOT, absolute)} from the skeleton`);
  }
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(CURRENT, `${relative(ROOT, absolute)}\n`);
  console.log(`current board: ${relative(ROOT, absolute)}`);
};

/**
 * The Stop hook. An invalid board blocks the stop with its errors; a changed board blocks it once, to publish the
 * page. The hash of the last board it asked to publish is kept beside the page, so an unchanged board never blocks.
 */
const hook = async () => {
  const input = (() => {
    try {
      return JSON.parse(readFileSync(0, 'utf8') || '{}');
    } catch {
      return {};
    }
  })();
  const source = currentSource();
  if (!source) {
    return;
  }
  const result = await build(source, false);
  const block = (reason: string) => console.log(JSON.stringify({ decision: 'block', reason }));
  if (result.errors.length > 0) {
    // A second block in one stop would loop on a board the agent cannot fix; say it on stderr instead.
    if (input.stop_hook_active) {
      console.error(format(source, result.errors));
      return;
    }
    block(`STATUS BOARD: fix ${relative(ROOT, source)}, then stop again.\n${format(source, result.errors)}`);
    return;
  }
  const marker = join(STATE_DIR, `${basename(source, '.md')}.hash`);
  if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === result.hash) {
    return;
  }
  writeFileSync(marker, `${result.hash}\n`);
  const lines = [
    `STATUS BOARD: ${relative(ROOT, source)} changed. Publish the page with the Artifact tool:`,
    `file_path=${result.page} (same path as before, so the URL stays; icon "checklist" on the first publish).`,
    'Then end the turn with one line. Do not repeat the board in the chat.',
  ];
  if (result.warnings.length > 0) {
    lines.push('Fix these STE findings first if they are real:', format(source, result.warnings));
  }
  block(lines.join('\n'));
};

const main = async () => {
  const [command, ...rest] = process.argv.slice(2);
  const args = rest.filter((arg) => !arg.startsWith('--'));
  const refIndex = rest.indexOf('--ref');
  const ref = refIndex >= 0 ? rest[refIndex + 1] : 'main';
  switch (command) {
    case 'start': {
      start(args[0] ?? fail('usage: cli.ts start <board.md>'));
      break;
    }
    case 'build': {
      const source = args[0] ? resolve(args[0]) : (currentSource() ?? fail('no board; run `cli.ts start <board.md>`'));
      const result = await build(source, rest.includes('--strict'));
      if (result.warnings.length > 0) {
        console.error(format(source, result.warnings));
      }
      if (result.errors.length > 0) {
        fail(format(source, result.errors));
      }
      console.log(result.page);
      break;
    }
    case 'hook': {
      await hook();
      break;
    }
    case 'template': {
      const action = args[0];
      if (action === 'build') {
        buildTemplate();
      } else if (action === 'push') {
        pushTemplate(ref);
      } else if (action === 'pull') {
        console.log(await pullTemplate(ref));
      } else {
        fail('usage: cli.ts template build | push [--ref main] | pull [--ref main]');
      }
      break;
    }
    default:
      fail('usage: cli.ts start <board.md> | build [<board.md>] [--strict] | hook | template build|push|pull');
  }
};

await main();
