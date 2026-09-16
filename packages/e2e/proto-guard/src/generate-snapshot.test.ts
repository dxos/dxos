//
// Copyright 2026 DXOS.org
//

import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

import { generateSnapshot } from './generate-snapshot.ts';
import { SpacesDumper } from './space-json-dump.ts';

test('can generate snapshot', async () => {
  const tmpDir = join(await tmpdir(), `proto-guard-${randomUUID()}`);
  await generateSnapshot(join(tmpDir, 'snapshot'), join(tmpDir, 'expected.json'));

  const dump = await SpacesDumper.load(join(tmpDir, 'expected.json'));
  expect(Object.keys(dump).length).toBeGreaterThanOrEqual(1);
});
