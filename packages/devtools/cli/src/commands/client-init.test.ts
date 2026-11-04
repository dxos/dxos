//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import fs from 'node:fs';
import path from 'node:path';

import { runDx, withIsolatedHome } from '../testing/index.ts';

/** ~5s per `dx` spawn from source. */
const TIMEOUT = 60_000;

/** A data root that is a file rather than a directory, so the client cannot open its storage. */
const breakDataRoot = (home: string) => {
  fs.mkdirSync(path.join(home, '.local/share'), { recursive: true });
  fs.writeFileSync(path.join(home, '.local/share/dx'), 'not a directory');
};

describe('client initialization', () => {
  test(
    'a command that never uses the client runs when the client cannot initialize',
    ({ expect }) => {
      withIsolatedHome((home) => {
        breakDataRoot(home);
        const { stdout, stderr, status } = runDx(['plugin', 'list', '--json'], { home });
        expect(status, stderr).toBe(0);
        expect(JSON.parse(stdout).length).toBeGreaterThan(0);
      });
    },
    TIMEOUT,
  );

  test(
    'a command that uses the client fails with why the client could not initialize',
    ({ expect }) => {
      withIsolatedHome((home) => {
        breakDataRoot(home);
        const { stdout, stderr, status } = runDx(['space', 'list'], { home });
        expect(status).not.toBe(0);
        // The CLI's error logger writes to stdout.
        const output = stdout + stderr;
        expect(output).toContain('Client failed to initialize');
        expect(output).toContain('ENOTDIR');
        expect(output).not.toContain('Client not initialized');
      });
    },
    TIMEOUT,
  );
});
