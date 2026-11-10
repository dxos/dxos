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
  await page.goto(TARGET);
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

/** A fresh load of the target, waited out until the app has booted. */
const boot = async (page: Page): Promise<void> => {
  await page.goto(TARGET);
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
  'navtree-group': 'F-1.1: the space navtree holds a WORLD CLOCK group with a Clocks page.',
  'map': 'F-1.2: the Clocks page renders a map.',
  'clocks-tick': 'F-1.3: the page shows HH:MM:SS clocks that change from one second to the next.',
  'timezone-shown': 'F-1.3: each clock names its timezone.',
} as const;

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

  mark('skill-fired', skillFired(events));
  try {
    await gradeBuild(workdir, tab, mark);
  } catch (error) {
    // A crash part way scores what it reached and reports why on the rest.
    for (const name of Object.keys(DIMENSIONS) as Dimension[]) {
      scores[name] ??= { score: 0, error: String(error).slice(0, 500) };
    }
  }
  return scores;
};

const gradeBuild = async (
  workdir: string,
  tab: Tab,
  mark: (name: Dimension, pass: boolean, error?: string) => void,
): Promise<void> => {
  const packageFile = path.join(workdir, 'package.json');
  if (!fs.existsSync(packageFile)) {
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  await boot(tab.page);
  const commit: string = await tab.page.evaluate(
    () => (globalThis as any).dxos.client.config.values.runtime?.app?.build?.commitHash ?? '',
  );
  const dxos = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).filter(([name]) =>
    name.startsWith('@dxos/'),
  );
  mark('pinned', dxos.length > 0 && dxos.every(([, spec]) => String(spec).endsWith(`@${commit.slice(0, 7)}`)));

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
    await boot(tab.page);
    await enableDevServer(tab.page);
    await boot(tab.page);
    const state = await tab.page.evaluate(
      (key) => (globalThis as any).composer.plugins().find((plugin: any) => plugin.id === key),
      manifest.key,
    );
    mark('loads', !!state?.enabled && !!state?.active);

    const { page } = tab;
    await page.keyboard.press('Escape');
    const spaceTab = page.getByRole('tab', { name: 'My Space' }).or(page.getByRole('button', { name: 'My Space' }));
    if (await spaceTab.first().isVisible()) {
      await spaceTab.first().click();
    }
    const group = await page
      .waitForFunction(() => document.body.innerText.includes('WORLD CLOCK'), null, { timeout: 20_000 })
      .then(
        () => true,
        () => false,
      );
    const clocksItem = page.getByText('Clocks', { exact: true }).first();
    const hasPage = group && (await clocksItem.isVisible());
    mark('navtree-group', hasPage);
    if (!hasPage) {
      return;
    }

    await clocksItem.click();
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
  finished: boolean;
  /** The agent's last message, for reading a failed run without re-running it. */
  lastMessage: string;
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
  const deadline = Date.now() + RUN_TIMEOUT;
  try {
    let prompt = BRIEF;
    while (turns < MAX_TURNS && Date.now() < deadline) {
      turns++;
      const turn = await agent.send(prompt);
      durationMillis += turn.end - turn.start;
      events.push(...turn.events);
      const calls = turnCalls(prompt, turn);
      calls.forEach(observed.generation);
      Usage.report(calls, link);

      lastMessage = turn.result ?? '';
      const reply = await personaReply(tab.session, lastMessage);
      if (reply.done) {
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
    return { scores, turns, durationMillis, finished, lastMessage: lastMessage.slice(0, 4_000) };
  } finally {
    await agent.close();
    killDevServer();
    await tab.context.close();
    await observed.finish();
    fs.rmSync(tab.profile, { recursive: true, force: true });
    fs.rmSync(workdir, { recursive: true, force: true });
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
