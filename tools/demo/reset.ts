#!/usr/bin/env tsx
//
// Copyright 2026 DXOS.org
//

/**
 * Wipe the persistent Playwright profile so the next `setup.ts` run behaves
 * like a fresh install. Useful between recording takes.
 */

import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = resolve(DEMO_DIR, 'playwright-user-data');

if (existsSync(USER_DATA_DIR)) {
  rmSync(USER_DATA_DIR, { recursive: true, force: true });
  console.log(`Removed ${USER_DATA_DIR}.`);
} else {
  console.log(`Nothing to remove at ${USER_DATA_DIR}.`);
}
