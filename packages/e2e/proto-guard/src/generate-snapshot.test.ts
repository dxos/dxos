import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import { generateSnapshot } from './generate-snapshot';
import { dbg } from '@dxos/log';
import { randomUUID } from 'node:crypto';

test('can generate snapshot', async () => {
  const tmpDir = join(await tmpdir(), `proto-guard-${randomUUID()}`);
  await generateSnapshot(join(tmpDir, 'snapshot'), join(tmpDir, 'expected.json'));
});
