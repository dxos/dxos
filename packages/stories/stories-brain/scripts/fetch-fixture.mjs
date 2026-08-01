//
// Copyright 2026 DXOS.org
//

// Fetches the private mailbox fixture from a live Gmail account — no storybook. Ensures an OAuth
// access token (see google-auth.mjs; one-time browser consent, then refresh-token automated), then
// runs the in-process Gmail sync + feed export via the plugin-inbox `fetch-fixture` test, writing
// fixtures/local/mailbox-feed.json (git-ignored).
//
// Usage:
//   export GOOGLE_CLIENT_ID=...  GOOGLE_CLIENT_SECRET=...   # one-time (see google-auth.mjs)
//   node scripts/fetch-fixture.mjs                          # sync + write the fixture
//   FETCH_AFTER=2025-01-01 node scripts/fetch-fixture.mjs   # override the sync-back start date
//
//   or, using Moon:
//   moon run stories-brain:fetch-fixture

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAccessToken } from './google-auth.mjs';

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const FIXTURE_OUT = resolve(PACKAGE_ROOT, 'fixtures/local/mailbox-feed.json');

const token = await getAccessToken();

const child = spawn(
  'pnpm',
  [
    '--filter',
    '@dxos/plugin-inbox',
    'exec',
    'vitest',
    'run',
    '--project=node',
    'src/operations/google/gmail/fetch-fixture.test.ts',
  ],
  {
    cwd: PACKAGE_ROOT,
    stdio: 'inherit',
    env: { ...process.env, GOOGLE_ACCESS_TOKEN: token, FIXTURE_OUT },
  },
);

child.on('exit', (code) => {
  if (code === 0) {
    console.error(`\nWrote fixture → ${FIXTURE_OUT}`);
  }
  process.exit(code ?? 1);
});
