#!/usr/bin/env tsx
//
// Copyright 2026 DXOS.org
//

/**
 * `pnpm demo` — one command to set up + run the Composer agent demo.
 *
 *   pnpm demo                 full end-to-end
 *   pnpm demo --fresh         wipe Playwright identity + start fresh
 *   pnpm demo --dry           no real Slack posts, no Trello card moves
 *   pnpm demo --setup-only    load creds + open windows; skip orchestration
 *   pnpm demo --populate      force re-populate Trello fixture
 *   pnpm demo --setup         interactive wizard for .env.demo
 *   pnpm demo --record        wrap a screencapture video around the run
 *
 * Design:
 *   - Playwright drives Composer (we need window.__DEMO__).
 *   - User's main Chrome hosts Trello + GitHub tabs (already signed in).
 *   - Slack desktop app is brought to front via `open -a Slack`.
 *   - macOS window layout puts Composer on the left, main Chrome on the right.
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { type BrowserContext, chromium, type Page } from 'playwright';

import { ensureDevServer } from './lib/dev-server';
import { loadFixture } from './lib/fixtures';
import { focusSlackApp, githubRepoUrl, openInMainChrome, trelloBoardUrl } from './lib/main-chrome';
import { collectLocalStorageValues, writeLocalStorage } from './lib/localstorage';
import { seedPluginSettings } from './lib/plugin-settings';
import { formatPreflight, runPreflight } from './lib/preflight';
import { startScreenRecording } from './lib/record';
import { runSetupWizard } from './lib/setup-wizard';
import { moveCardToList, populateTrelloBoard } from './lib/trello';
import { positionMainChromeRight, positionPlaywrightLeft } from './lib/window-layout';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = resolve(DEMO_DIR, 'playwright-user-data');
const SCREENSHOT_DIR = resolve(DEMO_DIR, 'screenshots');
const ENV_PATH = resolve(DEMO_DIR, '.env.demo');
const DEFAULT_COMPOSER_URL = 'http://localhost:5173';
const PAGE_TIMEOUT_MS = 90_000;
const NUDGE_WAIT_MS = 45_000;

type Args = {
  readonly fresh: boolean;
  readonly dry: boolean;
  readonly setupOnly: boolean;
  readonly populate: boolean;
  readonly setup: boolean;
  readonly record: boolean;
  readonly help: boolean;
};

const parseArgs = (argv: readonly string[]): Args => {
  const set = new Set(argv);
  return {
    fresh: set.has('--fresh'),
    dry: set.has('--dry'),
    setupOnly: set.has('--setup-only'),
    populate: set.has('--populate'),
    setup: set.has('--setup'),
    record: set.has('--record'),
    help: set.has('--help') || set.has('-h'),
  };
};

const printHelp = (): void => {
  console.log(`
Usage: pnpm demo [flags]

  --fresh         Wipe Playwright identity + start fresh
  --dry           Rehearsal mode: no Slack posts, no Trello card moves
  --setup-only    Load credentials + open windows; skip the orchestration
  --populate      Force re-populate the Trello fixture (even if cards exist)
  --setup         Interactive wizard for .env.demo, then exit
  --record        Start a macOS screencapture alongside the run
  --help, -h      This message
`);
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  // Interactive wizard short-circuits everything else.
  if (args.setup) {
    await runSetupWizard(ENV_PATH);
    return;
  }

  if (!existsSync(ENV_PATH)) {
    console.error(`Missing ${ENV_PATH}.`);
    console.error('Run `pnpm demo --setup` to populate it interactively,');
    console.error(`or copy tools/demo/.env.demo.example → .env.demo manually.`);
    process.exit(1);
  }
  dotenv.config({ path: ENV_PATH });

  // `--fresh` wipes the persistent browser profile so the next run looks like a new laptop.
  if (args.fresh && existsSync(USER_DATA_DIR)) {
    rmSync(USER_DATA_DIR, { recursive: true, force: true });
    console.log('Wiped Playwright profile.');
  }
  mkdirSync(USER_DATA_DIR, { recursive: true });
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // Chromium leaves stale SingletonLock / SingletonCookie / SingletonSocket
  // files behind when it's killed (SIGINT mid-run, system restart, etc.), and
  // will refuse to launch against that profile until they're cleaned up.
  for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try {
      rmSync(resolve(USER_DATA_DIR, lock), { force: true });
    } catch {
      // best-effort
    }
  }

  // ---- Pre-flight ----------------------------------------------------------
  console.log('\nPre-flight:');
  const checks = await runPreflight(process.env);
  console.log(formatPreflight(checks));
  const required = new Set(['Anthropic', 'Trello']);
  const blocking = checks.filter((check) => required.has(check.service) && check.status !== 'ok');
  if (blocking.length > 0) {
    console.error(`\nMissing required credentials: ${blocking.map((check) => check.service).join(', ')}`);
    console.error('Fix .env.demo (or run `pnpm demo --setup`) and retry.');
    process.exit(1);
  }

  // ---- Dev server ----------------------------------------------------------
  const composerUrl = process.env.COMPOSER_URL ?? DEFAULT_COMPOSER_URL;
  console.log(`\nDev server at ${composerUrl}:`);
  const devServer = await ensureDevServer(composerUrl);
  console.log(devServer.started ? `  started (log: ${devServer.logFile})` : '  already running');

  // ---- Trello fixture ------------------------------------------------------
  const fixture = loadFixture();
  const trelloAuth =
    process.env.TRELLO_API_KEY && process.env.TRELLO_API_TOKEN && process.env.TRELLO_BOARD_ID
      ? { key: process.env.TRELLO_API_KEY, token: process.env.TRELLO_API_TOKEN }
      : undefined;
  if (trelloAuth && (args.populate || args.fresh)) {
    console.log(`\nPopulating Trello board "${fixture.boardName}":`);
    const result = await populateTrelloBoard(
      { boardId: process.env.TRELLO_BOARD_ID!, lists: fixture.lists, cards: fixture.cards },
      trelloAuth,
    );
    console.log(
      `  lists created=${result.listsCreated.length}, cards created=${result.cardsCreated.length}, updated=${result.cardsUpdated.length}, unchanged=${result.cardsUnchanged.length}`,
    );
  }

  // ---- Optional screen recording ------------------------------------------
  const recording = args.record ? startScreenRecording() : undefined;
  if (recording) {
    console.log(`\nRecording to ${recording.file}`);
  }

  // ---- Open viewer surfaces in the user's main Chrome + Slack app ---------
  console.log('\nOpening viewer tabs in main Chrome:');
  const urls: string[] = [];
  if (process.env.TRELLO_BOARD_ID) {
    urls.push(trelloBoardUrl(process.env.TRELLO_BOARD_ID));
  }
  if (process.env.GITHUB_REPO) {
    urls.push(githubRepoUrl(process.env.GITHUB_REPO, 'pulls'));
  }
  if (urls.length > 0) {
    await openInMainChrome(urls);
    for (const url of urls) {
      console.log(`  ${url}`);
    }
  } else {
    console.log('  (no TRELLO_BOARD_ID or GITHUB_REPO — nothing to open)');
  }
  const slackFocused = await focusSlackApp();
  console.log(slackFocused ? '  Slack.app focused' : '  Slack.app not installed — skipping');

  // ---- Launch Playwright with persistent profile --------------------------
  console.log('\nLaunching Composer…');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-features=IsolateOrigins,site-per-process'],
  });

  const cleanup = async (): Promise<void> => {
    await recording?.stop().catch(() => undefined);
    await context.close().catch(() => undefined);
    if (devServer.started && devServer.process) {
      devServer.process.kill('SIGINT');
    }
  };
  process.on('SIGINT', () => void cleanup());

  try {
    const page = context.pages()[0] ?? (await context.newPage());

    await step('1. inject .env.demo into localStorage', async () => {
      await page.goto(composerUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT_MS }).catch(() => undefined);
      const values = collectLocalStorageValues(process.env);
      // `--dry` rehearsal: never let the panel fire real Slack posts.
      if (args.dry) {
        values.DEMO_LIVE_SLACK = 'false';
      }
      await writeLocalStorage(page, values);
      const seeded = await seedPluginSettings(page, process.env);
      if (seeded.length > 0) {
        console.log(`   · seeded plugin settings: ${seeded.join(', ')}`);
      }
      await page.reload({ waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT_MS }).catch(() => undefined);
      await takeScreenshot(page, '01-injected');
    });

    await step('2. position windows', async () => {
      await positionPlaywrightLeft(page);
      await positionMainChromeRight();
    });

    if (args.setupOnly) {
      printReadyBanner(composerUrl, { setupOnly: true, dry: args.dry });
      await holdOpen(context);
      return;
    }

    await step('3. wait for __DEMO__ + a ready space', async () => {
      await page.waitForFunction(
        () => {
          const api = (globalThis as any).__DEMO__;
          if (!api || typeof api.status !== 'function') {
            return false;
          }
          const client = (globalThis as any).__DXOS__?.client;
          if (!client) {
            return false;
          }
          if (client.spaces?.default) {
            return true;
          }
          const all = typeof client.spaces?.get === 'function' ? client.spaces.get() : [];
          return Array.isArray(all) && all.length > 0;
        },
        undefined,
        { timeout: PAGE_TIMEOUT_MS, polling: 500 },
      );
      await takeScreenshot(page, '03-demo-ready');
    });

    await step('4. bootstrap (schemas + fixtures + real Trello/Granola)', async () => {
      const result = await page.evaluate(async () => (globalThis as any).__DEMO__.bootstrap());
      console.log('   →', summarizeBootstrap(result));
      await takeScreenshot(page, '04-bootstrapped');
    });

    await step(`5. simulate drift: move "${fixture.drift?.card ?? '<none>'}" ${fixture.drift?.from ?? ''} → ${fixture.drift?.to ?? ''}`, async () => {
      if (args.dry) {
        console.log('   · --dry, skipping real Trello move');
        return;
      }
      if (!trelloAuth || !fixture.drift || !process.env.TRELLO_BOARD_ID) {
        console.log('   · Trello creds or drift spec missing, skipping');
        return;
      }
      const id = await moveCardToList(
        process.env.TRELLO_BOARD_ID,
        fixture.drift.card,
        fixture.drift.to,
        trelloAuth,
      );
      console.log(id ? `   · moved card ${id}` : `   · card "${fixture.drift.card}" not on board (run with --populate?)`);
    });

    await step('6. poll real GitHub for merged PRs', async () => {
      if (!process.env.GITHUB_PAT || !process.env.GITHUB_REPO) {
        console.log('   · GitHub creds missing, skipping');
        return;
      }
      try {
        await page.evaluate(async () => (globalThis as any).__DEMO__.pollGithub());
      } catch (err) {
        console.warn('   · pollGithub threw:', String(err));
      }
      await takeScreenshot(page, '06-github-polled');
    });

    await step('7. wait for a DemoNudge', async () => {
      const deadline = Date.now() + NUDGE_WAIT_MS;
      let latest: { events?: number; nudges?: { posted?: boolean; text: string }[] } | undefined;
      while (Date.now() < deadline) {
        latest = await page.evaluate(async () => (globalThis as any).__DEMO__.status());
        if ((latest?.nudges?.length ?? 0) > 0) {
          break;
        }
        await page.waitForTimeout(1000);
      }
      const nudges = latest?.nudges ?? [];
      console.log(`   · nudges: ${nudges.length}`);
      await takeScreenshot(page, '07-nudges');
    });

    printReadyBanner(composerUrl, { setupOnly: false, dry: args.dry });
    await holdOpen(context);
  } finally {
    await cleanup();
  }
};

const step = async (label: string, body: () => Promise<void>): Promise<void> => {
  console.log(`\n▶ ${label}`);
  const started = Date.now();
  try {
    await body();
    console.log(`  ✓ done (${Date.now() - started} ms)`);
  } catch (err) {
    console.error(`  ✗ failed: ${String(err)}`);
    throw err;
  }
};

const takeScreenshot = async (page: Page, name: string): Promise<void> => {
  await page
    .screenshot({ path: resolve(SCREENSHOT_DIR, `${name}.png`), fullPage: false })
    .catch(() => undefined);
};

const summarizeBootstrap = (result: { created?: string[]; skipped?: string[]; errors?: string[] }): string => {
  const parts: string[] = [];
  if (result.created?.length) parts.push(`created=${result.created.length}`);
  if (result.skipped?.length) parts.push(`skipped=${result.skipped.length}`);
  if (result.errors?.length) parts.push(`errors=${result.errors.length}`);
  return parts.join(' ') || 'no-op';
};

const printReadyBanner = (composerUrl: string, options: { setupOnly: boolean; dry: boolean }): void => {
  console.log('');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(options.setupOnly ? '  Setup complete. No orchestration ran.' : '  Demo is live. Start recording now.');
  console.log('');
  console.log(`  Composer  : ${composerUrl}`);
  console.log(`  Dry run   : ${options.dry ? 'YES — no real Slack posts or Trello moves' : 'no'}`);
  console.log('  Exit      : close the Chromium window or Ctrl+C.');
  console.log('──────────────────────────────────────────────────────────────');
};

const holdOpen = async (context: BrowserContext): Promise<void> => {
  await new Promise<void>((resolveFn) => {
    context.on('close', () => resolveFn());
    process.on('SIGINT', () => resolveFn());
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
