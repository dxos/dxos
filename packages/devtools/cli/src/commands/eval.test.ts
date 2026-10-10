//
// Copyright 2026 DXOS.org
//

import { afterAll, beforeAll, describe, test } from '@effect/vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { bootstrapProfile, hasErrorTrace, runDx } from '../testing/index.ts';

const TIMEOUT = 120_000;

/**
 * End-to-end: `dx eval` runs a program in the dialect a code-mode agent writes for its `eval` tool,
 * and a second process reads back what the first one wrote.
 */
describe('eval', () => {
  let home: string;
  let spaceId: string;

  const run = (args: string[], input?: string) =>
    runDx(['eval', '--space-id', spaceId, ...args], { home, input, timeout: TIMEOUT });

  beforeAll(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-eval-home-'));
    spaceId = bootstrapProfile(home);
  }, 300_000);

  afterAll(() => {
    fs.rmSync(home, { recursive: true, force: true });
  });

  test(
    'writes in one process and reads back in another',
    ({ expect }) => {
      // Plain dialect, from stdin: `make` takes the unversioned typename.
      const created = run(
        ['--dialect', 'plain'],
        `const task = await make('org.dxos.type.task', { title: 'Written by dx eval' });
         await add(task);
         await flush();
         print('created', task.title);`,
      );
      expect(created.status).toBe(0);
      expect(created.stdout.trim()).toBe('created Written by dx eval');
      expect(hasErrorTrace(created.stderr)).toBe(false);

      // Effect dialect, the default, as an argument.
      const read = run([
        `const tasks = yield* Database.query(Filter.type(DXN.make('org.dxos.type.task'))).run;
         yield* print(tasks.map((task) => task.title));`,
      ]);
      expect(read.status).toBe(0);
      expect(JSON.parse(read.stdout)).toContain('Written by dx eval');
    },
    TIMEOUT * 2,
  );

  test(
    'a failing program prints what it printed and the error, and exits non-zero',
    ({ expect }) => {
      const { stdout, status } = run(['--json', `yield* print('before'); yield* Effect.fail(new Error('boom'));`]);
      expect(status).not.toBe(0);
      const result = JSON.parse(stdout.slice(0, stdout.lastIndexOf('}') + 1));
      expect(result.ok).toBe(false);
      expect(result.output).toMatch(/^before\nError: .*boom/);
    },
    TIMEOUT,
  );

  test(
    '--instructions prints the API reference the agent is given',
    ({ expect }) => {
      const { stdout, status } = run(['--instructions']);
      expect(status).toBe(0);
      expect(stdout).toContain('## Code mode');
      expect(stdout).toContain('Database.resolve');
    },
    TIMEOUT,
  );
});
