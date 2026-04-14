#!/usr/bin/env tsx
//
// Copyright 2026 DXOS.org
//

/**
 * Playwright-driven demo bootstrap.
 *
 * Reads credentials from `./.env.demo` (gitignored), launches a persistent
 * Chrome profile at ./playwright-user-data, navigates to the running Composer
 * dev server, injects the credentials into localStorage, and leaves the
 * browser open so the recording can start immediately.
 *
 * Usage:
 *   1. Copy `.env.demo.example` → `.env.demo` and fill in real values.
 *   2. In another terminal: `moon run composer-app:serve`.
 *   3. Here: `pnpm tsx tools/demo/setup.ts`.
 *
 * Idempotent: the persistent profile keeps Composer's identity between runs,
 * so re-running just refreshes credentials and re-bootstraps.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { type BrowserContext, chromium, type Page } from 'playwright';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = resolve(DEMO_DIR, 'playwright-user-data');
const ENV_PATH = resolve(DEMO_DIR, '.env.demo');
const DEFAULT_COMPOSER_URL = 'http://localhost:5173';
const BOOTSTRAP_TIMEOUT_MS = 60_000;

const LOCAL_STORAGE_KEYS = [
  'ANTHROPIC_API_KEY',
  'TRELLO_API_KEY',
  'TRELLO_API_TOKEN',
  'TRELLO_BOARD_ID',
  'GRANOLA_API_KEY',
  'SLACK_BOT_TOKEN',
  'SLACK_CHANNELS',
  'SLACK_NUDGE_CHANNEL',
  'GITHUB_PAT',
  'GITHUB_REPO',
  'DEMO_PERSONA_NAME',
  'DEMO_PERSONA_EMAIL',
  'DEMO_ORG_NAME',
] as const;

const main = async (): Promise<void> => {
  if (!existsSync(ENV_PATH)) {
    console.error(`Missing ${ENV_PATH}.`);
    console.error('  1. cp tools/demo/.env.demo.example tools/demo/.env.demo');
    console.error('  2. fill in real credentials');
    process.exit(1);
  }
  dotenv.config({ path: ENV_PATH });

  const composerUrl = process.env.COMPOSER_URL ?? DEFAULT_COMPOSER_URL;
  if (!existsSync(USER_DATA_DIR)) {
    mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  if (process.env.DEMO_FRESH_START === 'true') {
    const { rmSync } = await import('node:fs');
    console.log('DEMO_FRESH_START=true → wiping persistent profile…');
    rmSync(USER_DATA_DIR, { recursive: true, force: true });
    mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  console.log(`Launching Chromium with profile at ${USER_DATA_DIR}…`);
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-features=IsolateOrigins,site-per-process'],
  });

  try {
    await navigateAndInject(context, composerUrl);
    printInstructions(composerUrl);
    console.log('\nKeeping the browser open. Close the Chromium window (or Ctrl+C) to exit.');
    await new Promise<void>((resolveFn) => {
      context.on('close', () => resolveFn());
      process.on('SIGINT', () => resolveFn());
    });
  } finally {
    await context.close().catch(() => undefined);
  }
};

const navigateAndInject = async (context: BrowserContext, composerUrl: string): Promise<void> => {
  const page = context.pages()[0] ?? (await context.newPage());
  console.log(`Navigating to ${composerUrl}…`);
  await page.goto(composerUrl, { waitUntil: 'domcontentloaded', timeout: BOOTSTRAP_TIMEOUT_MS });
  console.log('Waiting for Composer to boot (up to 60 s)…');
  await page.waitForLoadState('networkidle', { timeout: BOOTSTRAP_TIMEOUT_MS }).catch(() => undefined);

  const values = LOCAL_STORAGE_KEYS.reduce<Record<string, string>>((accumulator, key) => {
    const value = process.env[key];
    if (value && value.length > 0) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

  if (Object.keys(values).length === 0) {
    console.warn('No credentials found in .env.demo. Skipping localStorage injection.');
    return;
  }

  await writeLocalStorage(page, values);
  console.log(`Wrote ${Object.keys(values).length} credential(s) to localStorage:`);
  for (const key of Object.keys(values)) {
    console.log(`  ${key}=${'*'.repeat(Math.min(8, values[key].length))}`);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  console.log('Reloaded with credentials in place.');
};

const writeLocalStorage = async (page: Page, values: Record<string, string>): Promise<void> => {
  await page.evaluate((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      globalThis.localStorage.setItem(key, value);
    }
  }, values);
};

const printInstructions = (composerUrl: string): void => {
  console.log('');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Credentials are in localStorage. Finish setup in Composer:');
  console.log('');
  console.log('    1. Open (or create) a space.');
  console.log('    2. Add a "Demo Controls" object (via the deck graph).');
  console.log('    3. Click "Bootstrap from .env.demo (seed + wire credentials)".');
  console.log('    4. Wait for the body to carry data-demo-ready="true".');
  console.log('    5. Start recording.');
  console.log('');
  console.log(`  Composer URL: ${composerUrl}`);
  console.log('──────────────────────────────────────────────────────────────');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
