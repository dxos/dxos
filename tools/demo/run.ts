#!/usr/bin/env tsx
//
// Copyright 2026 DXOS.org
//

/**
 * End-to-end demo orchestrator.
 *
 * Launches Composer in a persistent Chromium profile, drives the full demo
 * narrative against real Trello / GitHub / Slack, and leaves the browser open
 * for screen recording.
 *
 * Steps:
 *   1. Inject .env.demo into localStorage.
 *   2. Reload; wait for window.__DEMO__ to mount.
 *   3. Call __DEMO__.bootstrap() (seeds fixtures + wires Trello/Granola).
 *   4. Move a real Trello card (Done → In Progress) to simulate drift.
 *   5. Call __DEMO__.pollGithub() so a real merged PR flows in.
 *   6. Wait for a DemoNudge to appear; if DEMO_LIVE_SLACK=true assert it posts.
 *   7. Open Slack web in a second tab (DEMO_OPEN_SLACK_WEB=true).
 *   8. Keep browser open; Ctrl+C exits.
 *
 * Run:
 *   pnpm --filter @dxos/demo-setup run run
 */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { type BrowserContext, chromium, type Page } from 'playwright';

import { collectLocalStorageValues, writeLocalStorage } from './lib/localstorage';
import { seedPluginSettings } from './lib/plugin-settings';
import { moveCardToList } from './lib/trello';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = resolve(DEMO_DIR, 'playwright-user-data');
const SCREENSHOT_DIR = resolve(DEMO_DIR, 'screenshots');
const ENV_PATH = resolve(DEMO_DIR, '.env.demo');
const DEFAULT_COMPOSER_URL = 'http://localhost:5173';
const DEFAULT_SLACK_URL = 'https://app.slack.com/client';
const PAGE_TIMEOUT_MS = 60_000;
const NUDGE_WAIT_MS = 45_000;

type RunStatus = { events: number; nudges: readonly { posted?: boolean; text: string }[] };

const main = async (): Promise<void> => {
  if (!existsSync(ENV_PATH)) {
    console.error(`Missing ${ENV_PATH}. Copy .env.demo.example → .env.demo and fill it in.`);
    process.exit(1);
  }
  dotenv.config({ path: ENV_PATH });

  if (!existsSync(USER_DATA_DIR)) {
    mkdirSync(USER_DATA_DIR, { recursive: true });
  }
  if (!existsSync(SCREENSHOT_DIR)) {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const composerUrl = process.env.COMPOSER_URL ?? DEFAULT_COMPOSER_URL;
  const liveSlack = process.env.DEMO_LIVE_SLACK === 'true';
  const openSlackWeb = process.env.DEMO_OPEN_SLACK_WEB !== 'false';

  console.log('Launching Chromium…');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-features=IsolateOrigins,site-per-process'],
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());

    await step('1/7  navigate + inject credentials', async () => {
      await page.goto(composerUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT_MS }).catch(() => undefined);
      const values = collectLocalStorageValues(process.env);
      if (Object.keys(values).length === 0) {
        throw new Error('No credentials in .env.demo');
      }
      await writeLocalStorage(page, values);
      const seeded = await seedPluginSettings(page, process.env);
      if (seeded.length > 0) {
        console.log(`   · seeded plugin-settings: ${seeded.join(', ')}`);
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT_MS }).catch(() => undefined);
      await screenshot(page, '01-injected');
    });

    await step('2/7  wait for __DEMO__ + a ready space', async () => {
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
        { timeout: PAGE_TIMEOUT_MS, polling: 500 },
      );
      await screenshot(page, '02-demo-ready');
    });

    await step('3/7  bootstrap (schemas + fixtures + real Trello/Granola)', async () => {
      const result = await page.evaluate(async () => (globalThis as any).__DEMO__.bootstrap());
      console.log('   →', summarizeBootstrap(result));
      await screenshot(page, '03-bootstrapped');
    });

    await step('4/7  move a Trello card (Done → In Progress)', async () => {
      const key = process.env.TRELLO_API_KEY;
      const token = process.env.TRELLO_API_TOKEN;
      const boardId = process.env.TRELLO_BOARD_ID;
      if (!key || !token || !boardId) {
        console.log('   · Trello creds missing, skipping');
        return;
      }
      const id = await moveCardToList(boardId, 'Onboarding redesign', 'In Progress', { key, token });
      console.log(id ? `   · moved card ${id}` : '   · card "Onboarding redesign" not found (run populate-trello?)');
    });

    await step('5/7  poll real GitHub for merged PRs', async () => {
      const repo = process.env.GITHUB_REPO;
      const pat = process.env.GITHUB_PAT;
      if (!repo || !pat) {
        console.log('   · GitHub creds missing, skipping');
        return;
      }
      try {
        await page.evaluate(async () => (globalThis as any).__DEMO__.pollGithub());
      } catch (err) {
        console.warn('   · pollGithub threw:', String(err));
      }
      await screenshot(page, '05-github-polled');
    });

    await step('6/7  wait for a DemoNudge', async () => {
      const deadline = Date.now() + NUDGE_WAIT_MS;
      let latest: RunStatus | undefined;
      while (Date.now() < deadline) {
        latest = (await page.evaluate(async () => (globalThis as any).__DEMO__.status())) as RunStatus;
        if (latest.nudges?.length > 0) {
          break;
        }
        await page.waitForTimeout(1000);
      }
      const nudges = latest?.nudges ?? [];
      console.log(`   · nudges: ${nudges.length}`);
      if (liveSlack && nudges.length > 0) {
        const posted = nudges.filter((nudge) => nudge.posted);
        console.log(`   · posted to Slack: ${posted.length}/${nudges.length}`);
      }
      await screenshot(page, '06-nudges');
    });

    await step('7/7  open Slack web (optional)', async () => {
      if (!openSlackWeb) {
        console.log('   · DEMO_OPEN_SLACK_WEB=false, skipping');
        return;
      }
      const slackPage = await context.newPage();
      await slackPage
        .goto(DEFAULT_SLACK_URL, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS })
        .catch((err) => console.warn('   · slack load warning:', String(err)));
    });

    printReadyBanner(composerUrl, liveSlack);
    await new Promise<void>((resolveFn) => {
      context.on('close', () => resolveFn());
      process.on('SIGINT', () => resolveFn());
    });
  } finally {
    await context.close().catch(() => undefined);
  }
};

const step = async (label: string, body: () => Promise<void>): Promise<void> => {
  console.log(`\n▶ ${label}`);
  const started = Date.now();
  try {
    await body();
    console.log(`  ✓ done (${Date.now() - started}ms)`);
  } catch (err) {
    console.error(`  ✗ failed: ${String(err)}`);
    throw err;
  }
};

const screenshot = async (page: Page, name: string): Promise<void> => {
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

const printReadyBanner = (composerUrl: string, liveSlack: boolean): void => {
  console.log('');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Demo is live. Start screen recording now.');
  console.log('');
  console.log(`  Composer  : ${composerUrl}`);
  console.log(`  Live Slack: ${liveSlack ? 'ON (nudges post for real)' : 'OFF (preview only)'}`);
  console.log('  Screenshots: tools/demo/screenshots/');
  console.log('  Exit: close browser or Ctrl+C.');
  console.log('──────────────────────────────────────────────────────────────');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
