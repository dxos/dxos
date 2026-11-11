//
// Copyright 2026 DXOS.org
//

import { type BrowserContext, type Page, chromium } from '@playwright/test';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { ClaudeAgent, type StreamEvent } from '@dxos/test-utils/claude-agent';
import { trim } from '@dxos/util';

import { turnCalls } from '../claude-harness.ts';
import * as Observe from '../Observe.ts';
import type * as Scorer from '../Scorer.ts';
import * as Usage from '../Usage.ts';

//
// A user who says only "I want to build a Composer plugin" and what it should do, handed to Claude
// Code with the dxos plugin loaded. The `composer-plugin-dev` skill has to fire on its own, and the
// agent has to build World Clock (the Composer Plugin template's plugin) in an empty folder and load
// it into a live Composer through the agent debug port.
//
// The user's browser tab is a headless Chromium signed in to the target as the test account. A
// simulated user answers the agent: it pastes the port's session id, clicks Enable under Dev Server
// when asked, and leaves every other choice to the agent. Grading then builds, serves and loads the
// plugin itself and reads the rendered page against World Clock's F-1 requirements.
//
// Needs `DX_ANTHROPIC_API_KEY`, `claude` on PATH, and Playwright's Chromium. Publishing (skill steps
// 6-8) is out of scope until targets carry dx's loopback login.
//

const API_KEY = process.env.DX_ANTHROPIC_API_KEY ?? '';
const MODEL = process.env.DX_EVAL_CLAUDE_MODEL ?? 'sonnet';
const TARGET = process.env.DX_EVAL_COMPOSER_URL ?? 'https://dev.composer.space';
const TEST_EMAIL = 'test+claude@dxos.org';

const PLUGIN_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../../tools/claude/plugins/dxos',
);
const PERSONA_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';
const DEV_SERVER_PORT = 3967;

/** Upper bound on the user's messages, the brief included. */
const MAX_TURNS = 12;
const TURN_TIMEOUT = 40 * 60_000;
const RUN_TIMEOUT = 55 * 60_000;

const BRIEF = trim`
  I want to build a Composer plugin: a world clock for each of my spaces. A map with a pin for each
  timezone, above a row of clocks that tick, so I can see what time it is for everyone on the team.
  My Composer is open at ${TARGET}.
`;

/**
 * Speed and cost score 1 at or under the target, falling linearly to 0 at the ceiling. Wall clock
 * covers the agent's turns only; cost is Claude Code's own `total_cost_usd`, persona excluded.
 */
const SPEED = { target: 5 * 60_000, ceiling: 25 * 60_000 };
const COST = { target: 0.25, ceiling: 2 };

const ALLOWED_TOOLS = ['Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Skill', 'TodoWrite', 'WebFetch', 'Write'];

//
// The user's tab.
//

/** A certificate for the port at the path the skill reads, created only where none exists. */
const ensurePortCertificate = (): void => {
  const dir = path.join(os.homedir(), '.dxos', 'debug-port');
  if (fs.existsSync(path.join(dir, 'cert.pem')) && fs.existsSync(path.join(dir, 'key.pem'))) {
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  // Self-signed: the tab ignores certificate errors, so it needs no trusted root (CI has no mkcert).
  execFileSync('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '7',
    '-keyout',
    path.join(dir, 'key.pem'),
    '-out',
    path.join(dir, 'cert.pem'),
    '-subj',
    '/CN=127.0.0.1',
    '-addext',
    'subjectAltName=IP:127.0.0.1,DNS:localhost',
  ]);
};

type Tab = { context: BrowserContext; page: Page; session: string; profile: string };

/** Signs in to the target as the test account and switches the debug port on, as the user would. */
const openTab = async (): Promise<Tab> => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-plugin-eval-tab-'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1400, height: 900 },
    args: [
      '--ignore-certificate-errors',
      // The page reaches the port and the dev server on loopback; headless cannot answer the prompt.
      '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults',
    ],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(
    () => document.querySelector('[role=alertdialog]') || (globalThis as any).dxos?.client?.halo?.identity?.get?.(),
    null,
    { timeout: 120_000 },
  );
  const signedIn = await page.evaluate(() => !!(globalThis as any).dxos?.client?.halo?.identity?.get?.());
  if (!signedIn) {
    await page.getByText('More ways to log in').click();
    await page.getByText("We'll send a login link.").click();
    await page.getByPlaceholder('Your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Your email').press('Enter');
    await page.waitForFunction(() => (globalThis as any).dxos?.client?.halo?.identity?.get?.(), null, {
      timeout: 120_000,
    });
  }
  // What Settings → Debug → Agent debug port calls.
  const session: string = await page.evaluate(() => (globalThis as any).dxos.debugPort.start({ persist: true }));
  return { context, page, session, profile };
};

/** The Dev Server's Enable, under Plugins settings. Returns whether the dev server is now enabled. */
const enableDevServer = async (page: Page): Promise<boolean> => {
  await page.evaluate(() =>
    (globalThis as any).composer.invoke('org.dxos.operation.appToolkit.openSettings', {
      plugin: 'org.dxos.plugin.registry',
    }),
  );
  const enable = page.getByRole('button', { name: 'Enable', exact: true });
  const disable = page.getByRole('button', { name: 'Disable', exact: true });
  await enable.or(disable).first().waitFor({ timeout: 30_000 });
  if (await enable.isVisible()) {
    await enable.click();
  }
  await disable.waitFor({ timeout: 30_000 });
  return true;
};

/** Retries `fn` across the reloads a plugin served by Vite triggers when its server starts. */
const acrossReloads = async <T>(page: Page, fn: () => Promise<T>): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === 3 || !/Execution context was destroyed|navigat/i.test(String(error))) {
        throw error;
      }
      await page.waitForLoadState('load');
    }
  }
};

/** A fresh load of the target, waited out until the app has booted. */
const boot = async (page: Page): Promise<void> => {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => (globalThis as any).composer?.plugins && document.querySelector('main'), null, {
    timeout: 120_000,
  });
};

//
// The simulated user.
//

const PersonaReply = Schema.Struct({
  message: Schema.String.annotate({ description: "The user's reply, in the first person, one to three sentences." }),
  enableDevServer: Schema.Boolean.annotate({
    description: 'True when the agent asks the user to click Enable under Dev Server in Composer.',
  }),
  done: Schema.Boolean.annotate({
    description: 'True when the agent reports the plugin built, loaded in Composer and working, and asks nothing more.',
  }),
});

const personaReply = (session: string, agentMessage: string) =>
  LanguageModel.generateObject({
    prompt: trim`
      You play a Composer user who asked a coding agent to build a world clock plugin. You are not
      technical about Composer's internals and you want the agent to make the decisions.

      Facts you know:
      - Your Composer is open at ${TARGET}, signed in.
      - If the agent asks you to switch on the agent debug port and paste the session id, it is on
        already: the session id is ${session}.
      - The certificates in ~/.dxos/debug-port are set up already.
      - Use "My Space" for any test objects.
      - You do not want it published yet; working in your Composer is enough for now.

      You can do one thing in Composer: click Enable under Dev Server in the Plugins settings. When
      the agent asks for that, set enableDevServer and say you clicked it. For anything else you are
      asked to click or check, say you would rather the agent check it through the debug port. When
      the agent asks you to choose, tell it to decide.

      The agent's latest message:
      <message>
      ${agentMessage}
      </message>
    `,
    schema: PersonaReply,
  }).pipe(
    Effect.provide(Layer.provideMerge(AiService.languageModel(PERSONA_MODEL), AiServiceTestingPreset('direct'))),
    Effect.map((response) => response.value),
    EffectEx.runAndForwardErrors,
  );

//
// Grading.
//

const DIMENSIONS = {
  'skill-fired': 'The agent loaded composer-plugin-dev on its own.',
  'pinned': "Every @dxos/* dependency is pinned to the target's commit.",
  'builds': 'The plugin builds and its manifest names its key.',
  'loads': 'Served from the dev server, the plugin is enabled and active in the target.',
  'navtree-group': 'F-1.1: the space navtree holds a clock-named group with a page under it.',
  'map': 'F-1.2: the Clocks page renders a map.',
  'clocks-tick': 'F-1.3: the page shows HH:MM:SS clocks that change from one second to the next.',
  'timezone-shown': 'F-1.3: each clock names its timezone.',
  'speed': "Wall clock of the agent's turns, 1 at 5 minutes or less, 0 at 25.",
  'cost': "Claude Code's reported spend, 1 at $0.25 or less, 0 at $2.",
} as const;

/** The pass/fail dimensions; speed and cost are graded on a curve and never crash. */
const CORRECTNESS = Object.keys(DIMENSIONS).filter((name) => name !== 'speed' && name !== 'cost') as Dimension[];

/** 1 at or under `target`, 0 at or over `ceiling`, linear between. */
const curve = (value: number, { target, ceiling }: { target: number; ceiling: number }): number =>
  Math.min(1, Math.max(0, (ceiling - value) / (ceiling - target)));

/**
 * Claude Code's spend for the session from each `result` event's `total_cost_usd`: the last value
 * when they only grow (cumulative), their sum when they do not (per turn).
 */
const costUsd = (events: readonly StreamEvent[]): number => {
  const costs = events
    .filter((event) => event.type === 'result')
    .map((event) => event.total_cost_usd)
    .filter((cost): cost is number => typeof cost === 'number');
  if (costs.length === 0) {
    return Number.NaN;
  }
  const cumulative = costs.every((cost, i) => i === 0 || cost >= costs[i - 1]);
  return cumulative ? costs[costs.length - 1] : costs.reduce((sum, cost) => sum + cost, 0);
};

type Dimension = keyof typeof DIMENSIONS;

const skillFired = (events: readonly StreamEvent[]): boolean =>
  events.some(
    (event) =>
      event.type === 'assistant' &&
      event.message.content.some(
        (block) =>
          block.type === 'tool_use' &&
          block.name === 'Skill' &&
          JSON.stringify(block.input).includes('composer-plugin-dev'),
      ),
  );

const run = (command: string, args: string[], cwd: string, timeout = 300_000): boolean => {
  try {
    execFileSync(command, args, { cwd, timeout, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const findManifest = (workdir: string): { key: string } | undefined => {
  const found = execFileSync('find', [workdir, '-name', 'manifest.json', '-not', '-path', '*/node_modules/*'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
    .find((manifest) => typeof manifest.key === 'string');
  return found;
};

const killDevServer = (): void => {
  try {
    const pids = execFileSync('lsof', ['-t', '-nP', `-iTCP:${DEV_SERVER_PORT}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
    for (const pid of pids.split('\n').filter(Boolean)) {
      process.kill(Number(pid));
    }
  } catch {
    // Nothing listening.
  }
};

const waitForPort = async (port: number, timeout: number): Promise<boolean> => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ok = await fetch(`http://localhost:${port}/manifest.json`).then(
      (r) => r.ok,
      () => false,
    );
    if (ok) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  return false;
};

/** Grades the folder and the tab the agent left. Every dimension the run never reached scores 0. */
const grade = async (workdir: string, tab: Tab, events: readonly StreamEvent[]): Promise<Scorer.Scores> => {
  const scores: Scorer.Scores = {};
  const mark = (name: Dimension, pass: boolean, error?: string) => {
    scores[name] = { score: pass ? 1 : 0, ...(error ? { error } : {}) };
  };
  const progress = { stage: 'start' };

  mark('skill-fired', skillFired(events));
  try {
    await gradeBuild(workdir, tab, mark, progress);
  } catch (error) {
    // A crash part way scores what it reached and reports where and why on the rest.
    for (const name of CORRECTNESS) {
      scores[name] ??= { score: 0, error: `${progress.stage}: ${String(error).slice(0, 500)}` };
    }
  }
  return scores;
};

const gradeBuild = async (
  workdir: string,
  tab: Tab,
  mark: (name: Dimension, pass: boolean, error?: string) => void,
  progress: { stage: string },
): Promise<void> => {
  const packageFile = path.join(workdir, 'package.json');
  if (!fs.existsSync(packageFile)) {
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  progress.stage = 'boot';
  await boot(tab.page);
  const commit: string = await tab.page.evaluate(
    () => (globalThis as any).dxos.client.config.values.runtime?.app?.build?.commitHash ?? '',
  );
  const dxos = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).filter(([name]) =>
    name.startsWith('@dxos/'),
  );
  mark('pinned', dxos.length > 0 && dxos.every(([, spec]) => String(spec).endsWith(`@${commit.slice(0, 7)}`)));

  progress.stage = 'build';
  const built = run('npx', ['vite', 'build'], workdir);
  const manifest = built ? findManifest(workdir) : undefined;
  mark('builds', manifest !== undefined);
  if (!manifest) {
    return;
  }

  // The grader's own dev server, so the agent's having stopped its own is not a failure to load.
  killDevServer();
  const server = spawn('npx', ['vite'], { cwd: workdir, stdio: 'ignore', detached: true });
  try {
    if (!(await waitForPort(DEV_SERVER_PORT, 60_000))) {
      mark('loads', false, 'the dev server did not serve manifest.json');
      return;
    }
    // A plugin the tab loaded from the agent's server reloads the page when that server goes, so
    // start from a fresh load once the grader's own server is up.
    const { page } = tab;
    progress.stage = 'boot before Enable';
    await acrossReloads(page, () => boot(page));
    progress.stage = 'Enable under Dev Server';
    await acrossReloads(page, () => enableDevServer(page));
    progress.stage = 'boot with the dev server';
    await acrossReloads(page, () => boot(page));
    progress.stage = 'plugin state';
    const loaded = await acrossReloads(page, () =>
      page
        .waitForFunction(
          (key) => {
            const plugin = (globalThis as any).composer?.plugins?.().find((plugin: any) => plugin.id === key);
            return plugin?.enabled && plugin?.active;
          },
          manifest.key,
          { timeout: 60_000 },
        )
        .then(
          () => true,
          (error) => {
            if (/Execution context was destroyed|navigat/i.test(String(error))) {
              throw error;
            }
            return false;
          },
        ),
    );
    mark('loads', loaded);

    progress.stage = 'navtree';
    // A reload leaves a space's rail tab pending ("Loading space…") until the space opens; its
    // navtree exists only once that tab is clicked. Prefer "My Space", the persona's test space.
    const ready = '[data-testid^="spacePlugin.space"]:not([data-testid="spacePlugin.space.pending"])';
    await page.waitForSelector(ready, { timeout: 180_000 }).catch(() => undefined);
    const spaceTab = page.locator(ready, { hasText: 'My Space' }).or(page.locator(ready)).first();
    if (await spaceTab.isVisible().catch(() => false)) {
      await spaceTab.click();
    }
    // The brief names neither the group nor its page, so any clock-named group heading (uppercase
    // by CSS) with a clock-named item under it passes.
    const group = await page
      .waitForFunction(() => /^[A-Z0-9 ]*CLOCK[A-Z0-9 ]*$/m.test(document.body.innerText), null, { timeout: 30_000 })
      .then(
        () => true,
        () => false,
      );
    // The last clock-named navtree entry outside `main` that is not the uppercase group heading.
    const openedPage =
      group &&
      (await page.evaluate(() => {
        const item = [...document.querySelectorAll('*')]
          .filter(
            (e) =>
              e.childElementCount === 0 &&
              /clock/i.test(e.textContent ?? '') &&
              !e.closest('main') &&
              getComputedStyle(e).textTransform !== 'uppercase',
          )
          .pop();
        const target = item?.closest('a,button,[role=treeitem],li') ?? item;
        (target as HTMLElement | undefined)?.click();
        return !!target;
      }));
    mark('navtree-group', openedPage);
    if (!openedPage) {
      await page.screenshot({ path: path.join(workdir, '.eval-navtree.png') }).catch(() => undefined);
      const tabs = await page
        .evaluate(() =>
          [...document.querySelectorAll('[role=tab]')].map((e) => `${e.getAttribute('data-testid')}:${e.textContent}`),
        )
        .catch(() => []);
      fs.writeFileSync(path.join(workdir, '.eval-navtree.json'), JSON.stringify({ group, tabs }, null, 2));
      return;
    }

    progress.stage = 'clock page';
    const timePattern = /\b([01]\d|2[0-3]):[0-5]\d:[0-5]\d\b/g;
    const times = () => page.evaluate(() => document.querySelector('main')?.innerText ?? '');
    await page
      .waitForFunction(() => /\d{2}:\d{2}:\d{2}/.test(document.querySelector('main')?.innerText ?? ''), null, {
        timeout: 20_000,
      })
      .catch(() => undefined);
    const before = await times();
    await page.waitForTimeout(2_500);
    const after = await times();
    const broken = after.includes('Unable to open this object');
    const ticks = (before.match(timePattern) ?? []).join() !== (after.match(timePattern) ?? []).join();
    mark('clocks-tick', !broken && (after.match(timePattern) ?? []).length > 0 && ticks);
    mark('timezone-shown', !broken && /\b[A-Z][a-z]+\/[A-Z][A-Za-z_]+\b|\bUTC\b/.test(after));
    const map = await page.evaluate(() => {
      const main = document.querySelector('main');
      return !!main && (main.querySelectorAll('canvas').length > 0 || main.querySelectorAll('svg path').length > 20);
    });
    mark('map', !broken && map);
  } finally {
    if (server.pid !== undefined) {
      try {
        process.kill(-server.pid);
      } catch {
        // Already gone.
      }
    }
  }
};

//
// The run.
//

type Output = {
  scores: Scorer.Scores;
  turns: number;
  durationMillis: number;
  costUsd: number;
  finished: boolean;
  /** The agent's last message, for reading a failed run without re-running it. */
  lastMessage: string;
  /** Every message in order: the brief, the agent's replies, and the persona's, the last one unsent when it ends the run. */
  conversation: { role: 'user' | 'agent'; text: string }[];
};

const task = async (): Promise<Output> => {
  if (API_KEY.length === 0) {
    throw new Error('DX_ANTHROPIC_API_KEY is not set; this eval spends real tokens and cannot run without it.');
  }
  ensurePortCertificate();
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-plugin-eval-'));
  const experiment = Observe.experiment();
  const observed = Observe.start(experiment);
  const link: Usage.Link = { traceId: observed.traceId, experimentId: experiment.id, experimentName: experiment.name };
  const tab = await openTab();
  const agent = ClaudeAgent.start({
    cwd: workdir,
    mcpServers: {},
    apiKey: API_KEY,
    model: MODEL,
    allowedTools: ALLOWED_TOOLS,
    pluginDirs: [PLUGIN_DIR],
    bare: false,
    timeout: TURN_TIMEOUT,
  });

  const events: StreamEvent[] = [];
  let turns = 0;
  let durationMillis = 0;
  let finished = false;
  let lastMessage = '';
  const conversation: Output['conversation'] = [];
  let keep = false;
  const deadline = Date.now() + RUN_TIMEOUT;
  try {
    let prompt = BRIEF;
    while (turns < MAX_TURNS && Date.now() < deadline) {
      turns++;
      conversation.push({ role: 'user', text: prompt });
      const turn = await agent.send(prompt);
      durationMillis += turn.end - turn.start;
      events.push(...turn.events);
      const calls = turnCalls(prompt, turn);
      calls.forEach(observed.generation);
      Usage.report(calls, link);

      lastMessage = turn.result ?? '';
      conversation.push({ role: 'agent', text: lastMessage });
      const reply = await personaReply(tab.session, lastMessage);
      if (reply.done) {
        conversation.push({ role: 'user', text: reply.message });
        finished = true;
        break;
      }
      if (reply.enableDevServer) {
        await enableDevServer(tab.page).catch(() => undefined);
      }
      prompt = reply.message;
    }
    await agent.close();
    const scores = await grade(workdir, tab, events);
    const cost = costUsd(events);
    scores.speed = { score: curve(durationMillis, SPEED) };
    scores.cost = Number.isNaN(cost)
      ? { score: 0, error: 'no total_cost_usd on any result event' }
      : { score: curve(cost, COST) };
    const output = {
      scores,
      turns,
      durationMillis,
      costUsd: cost,
      finished,
      lastMessage: lastMessage.slice(0, 4_000),
      conversation,
    };
    keep = CORRECTNESS.some((name) => (scores[name]?.score ?? 0) < 1);
    // evalite's table truncates. A failed run keeps the agent's folder; every run keeps its scores
    // and event stream, for reading where the time and money went.
    const record = keep ? workdir : fs.mkdtempSync(path.join(os.tmpdir(), 'dx-plugin-eval-record-'));
    fs.writeFileSync(path.join(record, '.eval-output.json'), JSON.stringify(output, null, 2));
    fs.writeFileSync(path.join(record, '.eval-events.jsonl'), events.map((event) => JSON.stringify(event)).join('\n'));
    const summary = Object.entries(scores)
      .map(([name, { score }]) => `${name}=${Math.round(score * 100) / 100}`)
      .join(' ');
    console.log(
      `composer-plugin-dev: ${summary} turns=${turns} minutes=${(durationMillis / 60_000).toFixed(1)} usd=${cost.toFixed(2)} record=${record}`,
    );
    return output;
  } finally {
    await agent.close();
    killDevServer();
    await tab.context.close();
    await observed.finish();
    fs.rmSync(tab.profile, { recursive: true, force: true });
    if (!keep) {
      fs.rmSync(workdir, { recursive: true, force: true });
    }
  }
};

evalite('Composer plugin dev: a one-line brief to World Clock loaded in a live Composer', {
  data: [{ input: null }],
  task,
  scorers: Object.entries(DIMENSIONS).map(([name, description]) => ({
    name,
    description,
    scorer: ({ output }: { output: Output }) => {
      const recorded = output?.scores?.[name];
      return { score: recorded?.score ?? 0, metadata: { error: recorded?.error } };
    },
  })),
});
