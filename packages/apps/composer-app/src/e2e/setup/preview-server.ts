//
// Copyright 2026 DXOS.org
//

import { assertPwaDisabled, startWebServer } from './web-server';

/**
 * Vitest global setup for the production e2e suite: serves the built bundle on 4173.
 */
export default async (): Promise<() => Promise<void>> => {
  assertPwaDisabled();
  return startWebServer({ command: ['pnpm', 'vite', 'preview', '--port', '4173'], port: 4173 });
};
