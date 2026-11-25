#!/usr/bin/env -S node --conditions=source
//
// Copyright 2026 DXOS.org
//

// Turns a session's `SESSION.mdl` (`lang/session.mdl`) into a single-file react-ui page, without a bundler.
//
//   cli.ts start <session dir>              # make <dir>/SESSION.mdl the session's board (a skeleton if absent)
//   cli.ts build [<SESSION.mdl>] [--strict] [--offline] # parse, check, add PR state from GitHub, write the page
//   cli.ts session-id                    # the ids Composer may file this session under, most likely first
//   cli.ts tasks <tasks.json>... [--session-object <echo URI>]...  # merge Composer tasks into the board as goals
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

import { githubState, mergeState } from './github.ts';
import { type Problem, type Sentence, parseSession } from './session.ts';
import { delegatedTo, readTasks, sessionIds, syncTasks } from './tasks.ts';
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

/** A new session file: the frontmatter, the Extensions table, and one goal to replace. */
const skeleton = (slug: string) => `---
id: org.dxos.session.${slug}
name: Session title
version: 1.0
extends:
  - org.dxos.spec.session
---

# Session title

One line that says what this session is for.

## Extensions

| Term       | URI                          |
| ---------- | ---------------------------- |
| \`question\` | \`org.dxos.mdl.question@1.0\` |
| \`decision\` | \`org.dxos.mdl.decision@1.0\` |
| \`goal\`     | \`org.dxos.mdl.goal@1.0\`     |
| \`pr\`       | \`org.dxos.mdl.pr@1.0\`       |
| \`event\`    | \`org.dxos.mdl.event@1.0\`    |

## Goals

\`\`\`mdl
goal G-1: Write the first goal here.
  status: started
\`\`\`

## Pull requests

## Changelog

## Timeline

\`\`\`mdl
event T-1: The session started.
  date: ${new Date().toISOString().slice(0, 16)}Z
\`\`\`
`;

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const git = (...args: string[]): string | undefined => {
  try {
    // The index listing of this repo is several MB, above the 1 MB default that would make it read as a failure.
    return execFileSync('git', ['-C', ROOT, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 256 * 1024 * 1024,
    }).trim();
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
  // A checker that did not run is reported, so a strict build cannot pass without the check.
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    const reason = result.error?.message ?? (result.stderr.trim() || `exit code ${result.status}`);
    return [{ line: 1, message: `STE check did not run: ${reason}` }];
  }
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

/** A session's name: its directory, since every session file is called `SESSION.mdl`. */
const sessionName = (source: string) => basename(dirname(source));

const pagePath = (source: string) => join(STATE_DIR, `${sessionName(source)}.html`);

const build = async (source: string, strict: boolean, offline = false): Promise<BuildResult> => {
  const text = readFileSync(source, 'utf8');
  // The PR's base catches an edit already committed on the branch; the last commit catches one about to be.
  const path = relative(ROOT, source);
  const base = git('merge-base', 'origin/main', 'HEAD');
  const previous = [base && git('show', `${base}:${path}`), git('show', `HEAD:${path}`)].filter(
    (version): version is string => typeof version === 'string',
  );
  const { board, errors, sentences } = parseSession(text, { source: path, previous });
  const ste = checkSte(sentences);
  const warnings = strict ? [] : ste;
  if (strict) {
    errors.push(...ste);
  }
  if (!board || errors.length > 0) {
    return { source, errors, warnings };
  }
  if (board.prs.length > 0 && !offline) {
    const github = await githubState(board.prs, join(STATE_DIR, 'github.json'));
    board.prs = board.prs.map((pr) => mergeState(pr, github.state.get(pr.ref)));
    warnings.push(...github.warnings.map((message) => ({ line: 1, message })));
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

const start = (directory: string) => {
  const absolute = join(resolve(directory), 'SESSION.mdl');
  if (!existsSync(absolute)) {
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, skeleton(sessionName(absolute)));
    console.log(`wrote ${relative(ROOT, absolute)} from the skeleton`);
  }
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(CURRENT, `${relative(ROOT, absolute)}\n`);
  console.log(`current board: ${relative(ROOT, absolute)}`);
};

/** The tracked and changed files, outside the board's own files, so a change of the work is told from a change of the board. */
const repoState = (source: string): string => {
  const exclude = [`:!${relative(ROOT, source)}`, ':!.claude/.status-board'];
  // Contents, not names or HEAD: committing the board reads as no change, and a second edit to a changed file does not.
  // Changed and untracked files are hashed by name, so the output stays one line per file however large the edit.
  const paths = (...args: string[]) => (git(...args, '-z', '--', '.', ...exclude) ?? '').split('\0').filter(Boolean);
  const changed = [...paths('diff', '--name-only'), ...paths('ls-files', '--others', '--exclude-standard')];
  const hashes =
    changed.length > 0
      ? spawnSync('git', ['-C', ROOT, 'hash-object', '--stdin-paths'], {
          input: changed.join('\n'),
          encoding: 'utf8',
          maxBuffer: 64 * changed.length + 1024,
        })
      : undefined;
  if (hashes && (hashes.error || hashes.status !== 0)) {
    throw new Error(`git hash-object failed: ${hashes.error?.message ?? hashes.stderr}`);
  }
  return createHash('sha256')
    .update(git('ls-files', '-s', '--', '.', ...exclude) ?? '')
    .update(changed.join('\n'))
    .update(hashes?.stdout ?? '')
    .digest('hex')
    .slice(0, 16);
};

type Marker = { hash?: string; repo?: string };

/**
 * The Stop hook. It never blocks a stop that a Stop hook already continued (`stop_hook_active`), so it cannot loop.
 * Otherwise it blocks once: for an invalid file, for a changed board (to publish it), or for work that changed while
 * the board did not (to remind the agent to update it). The marker beside the page holds what it last asked about.
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
  if (!source || input.stop_hook_active) {
    return;
  }
  const result = await build(source, false);
  const block = (reason: string) => console.log(JSON.stringify({ decision: 'block', reason }));
  const name = relative(ROOT, source);
  if (result.errors.length > 0) {
    block(`STATUS BOARD: fix ${name}, then stop again.\n${format(source, result.errors)}`);
    return;
  }
  const markerFile = join(STATE_DIR, `${sessionName(source)}.json`);
  // Written only by this hook, so it is not validated again.
  const marker: Marker = existsSync(markerFile) ? JSON.parse(readFileSync(markerFile, 'utf8')) : {};
  const repo = repoState(source);
  writeFileSync(markerFile, JSON.stringify({ hash: result.hash, repo }));
  if (marker.hash !== result.hash) {
    const lines = [
      `STATUS BOARD: ${name} changed. Publish the page with the Artifact tool:`,
      `file_path=${result.page} (same path as before, so the URL stays; icon "checklist" on the first publish).`,
      'Then end the turn with one line. Do not repeat the board in the chat.',
    ];
    if (result.warnings.length > 0) {
      lines.push('Fix these findings first if they are real:', format(source, result.warnings));
    }
    block(lines.join('\n'));
  } else if (marker.repo !== undefined && marker.repo !== repo) {
    block(
      [
        `STATUS BOARD: the work changed but ${name} did not.`,
        'If a goal, PR or question changed, update it and add a timeline event; the next stop publishes it.',
        'If nothing on the board changed, end the turn.',
      ].join('\n'),
    );
  }
};

/**
 * Merges the tasks of a Composer MCP result into the current board. The file is the JSON the agent saved from
 * `tasks.recordSession` or `tasks.list`: an object with a `tasks` array, or the array itself.
 */
const tasks = (files: readonly string[], sessionObjects: readonly string[]) => {
  const source = currentSource() ?? fail('no session; run `cli.ts start .agents/sessions/<date>-<slug>`');
  // Every file of one pull is merged first: a goal is missing only when no project or space returned its task.
  const list = files.flatMap(
    (file) => readTasks(JSON.parse(readFileSync(resolve(file), 'utf8'))) ?? fail(`${file}: expected a \`tasks\` array`),
  );
  const result = syncTasks(readFileSync(source, 'utf8'), delegatedTo(list, sessionObjects));
  writeFileSync(source, result.text);
  const report = (label: string, ids: string[]) => ids.length > 0 && console.log(`${label}: ${ids.join(', ')}`);
  report('added', result.added);
  report('updated', result.updated);
  report('not in the input (closed, or another session took it)', result.missing);
  report('skipped, no echo://<space>/<id> URI in the input', result.skipped);
  if (result.added.length + result.updated.length === 0) {
    console.log(`${relative(ROOT, source)}: no change`);
  }
};

const main = async () => {
  const [command, ...rest] = process.argv.slice(2);
  const args = rest.filter((arg) => !arg.startsWith('--'));
  const refIndex = rest.indexOf('--ref');
  const ref = refIndex >= 0 ? rest[refIndex + 1] : 'main';
  switch (command) {
    case 'start': {
      start(args[0] ?? fail('usage: cli.ts start <session dir>'));
      break;
    }
    case 'session-id': {
      const ids = sessionIds();
      if (ids.length === 0) {
        fail('no session id in the environment (CLAUDE_CODE_REMOTE_SESSION_ID, CLAUDE_CODE_SESSION_ID)');
      }
      console.log(ids.join('\n'));
      break;
    }
    case 'tasks': {
      // `--session-object` repeats: a session recorded in several spaces has one object in each.
      const sessionObjects = rest.flatMap((arg, index) => (rest[index - 1] === '--session-object' ? [arg] : []));
      const files = rest.filter((arg, index) => !arg.startsWith('--') && rest[index - 1] !== '--session-object');
      tasks(
        files.length > 0 ? files : fail('usage: cli.ts tasks <tasks.json>... [--session-object <echo URI>]...'),
        sessionObjects,
      );
      break;
    }
    case 'build': {
      const source = args[0]
        ? resolve(args[0])
        : (currentSource() ?? fail('no session; run `cli.ts start .agents/sessions/<date>-<slug>`'));
      const result = await build(source, rest.includes('--strict'), rest.includes('--offline'));
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
      fail(
        'usage: cli.ts start <session dir> | build [<SESSION.mdl>] [--strict] | session-id | tasks <tasks.json> | hook | template build|push|pull',
      );
  }
};

// Node's fetch ignores HTTPS_PROXY unless asked, and a sandbox reaches GitHub only through its proxy.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawnSync(
    process.execPath,
    [...process.execArgv, '--disable-warning=UNDICI-EHPA', ...process.argv.slice(1)],
    {
      stdio: 'inherit',
      env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
    },
  );
  process.exit(child.status ?? 1);
}
await main();
