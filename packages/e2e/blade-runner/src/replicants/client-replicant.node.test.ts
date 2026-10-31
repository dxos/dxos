//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'vitest';

import { type ReplicantEnv } from '../env/index.ts';
import { ClientReplicant } from './client-replicant.ts';

describe('ClientReplicant', () => {
  const replicants: ClientReplicant[] = [];
  const dirs: string[] = [];

  afterEach(async () => {
    for (const replicant of replicants.splice(0)) {
      await replicant.destroy();
    }
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  const makeReplicant = async (): Promise<ClientReplicant> => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'client-replicant-'));
    dirs.push(outDir);
    const env: ReplicantEnv = {
      params: {
        replicantClass: 'ClientReplicant',
        replicantId: 'test',
        outDir,
        logFile: path.join(outDir, 'agent.log'),
        planRunDir: outDir,
        redisPortSendQueue: '',
        redisPortReceiveQueue: '',
        redisTracingQueue: '',
        runtime: { platform: 'nodejs' },
        testId: 'test',
      },
      syncBarrier: async () => {},
      syncData: async () => [],
    };
    const replicant = new ClientReplicant(env);
    replicants.push(replicant);
    // Nothing listens here: deleting data that was never created must not need EDGE.
    await replicant.init({ edgeUrl: 'http://127.0.0.1:9', agents: false, partitions: false });
    return replicant;
  };

  test('a replicant that never created an identity has nothing to delete', async ({ expect }) => {
    const replicant = await makeReplicant();
    expect(await replicant.deleteOwnData({ spaceIds: [] })).toEqual({ accepted: [], refused: [] });
  });

  test('spaces named by a replicant with no identity are refused, not silently dropped', async ({ expect }) => {
    const replicant = await makeReplicant();
    expect(await replicant.deleteOwnData({ spaceIds: ['space-a'] })).toEqual({ accepted: [], refused: ['space-a'] });
  });
});
