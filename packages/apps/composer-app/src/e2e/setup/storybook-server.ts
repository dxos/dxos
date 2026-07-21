//
// Copyright 2026 DXOS.org
//

import { startWebServer } from './web-server';

/**
 * Vitest global setup for the Welcome focus harness: serves the shared storybook on 9009,
 * reusing an already-running instance when present.
 */
export default async (): Promise<() => Promise<void>> => {
  return startWebServer({
    command: [
      'pnpm',
      '--dir',
      '../../../tools/storybook-react',
      'exec',
      'storybook',
      'dev',
      '--port',
      '9009',
      '--no-open',
      '--ci',
    ],
    port: 9009,
    timeout: 300_000,
    reuseExisting: true,
  });
};
