//
// Copyright 2026 DXOS.org
//

import { assertPwaDisabled, startWebServer } from './web-server';

/**
 * Vitest global setup for the dev-startup harness: boots `vite serve` (vite's default
 * subcommand) on 4173 so the harness's INITIAL_URL keeps working without a second
 * URL constant. The first run after a `pnpm install` may be slow because vite has to
 * pre-bundle deps from a cold cache; subsequent runs amortize via `node_modules/.vite`.
 */
export default async (): Promise<() => Promise<void>> => {
  assertPwaDisabled();
  return startWebServer({ command: ['pnpm', 'vite', '--port', '4173'], port: 4173, timeout: 300_000 });
};
