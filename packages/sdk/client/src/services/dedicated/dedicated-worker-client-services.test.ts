import { describe, test } from 'vitest';
import { DedicatedWorkerClientServices } from './dedicated-worker-client-services';
import Worker from 'web-worker';

describe(
  'DedicatedWorkerClientServices',
  () => {
    test('open & close', async () => {
      await using services = await new DedicatedWorkerClientServices(
        () => new Worker(new URL('./worker-entrypoint.ts', import.meta.url), { type: 'module' }),
      ).open();
    });
  },
  { timeout: 1_000, retry: 0 },
);
