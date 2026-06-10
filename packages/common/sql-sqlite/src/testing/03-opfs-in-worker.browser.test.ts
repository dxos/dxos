//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createSerializedDatabase, isValidSqliteDatabase } from './opfs-test-helpers';

type InWorkerRequest = ['run', testCase: string, payload?: string | Uint8Array];

type InWorkerResponse = ['ready'] | ['result', unknown] | ['error', string];

const spawnInWorkerTestRunner = (): Worker =>
  new Worker(new URL('./opfs-in-worker-test-worker.ts', import.meta.url), { type: 'module' });

const waitForInWorkerResponse = (
  worker: Worker,
  predicate: (message: InWorkerResponse) => boolean,
  timeoutMs = 60_000,
): Promise<InWorkerResponse> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      reject(new Error('In-worker test runner timed out'));
    }, timeoutMs);

    const onMessage = (event: MessageEvent<InWorkerResponse>) => {
      const message = event.data;
      if (predicate(message)) {
        clearTimeout(timeout);
        worker.removeEventListener('message', onMessage);
        resolve(message);
      }
    };

    worker.addEventListener('message', onMessage);
  });

const waitForRunnerReady = async (worker: Worker): Promise<void> => {
  await waitForInWorkerResponse(worker, ([type]) => type === 'ready');
};

const runInWorkerTest = async (
  worker: Worker,
  testCase: string,
  payload?: string | Uint8Array,
): Promise<unknown> => {
  const responsePromise = waitForInWorkerResponse(
    worker,
    ([type]) => type === 'result' || type === 'error',
  );

  if (payload instanceof Uint8Array) {
    const copy = new Uint8Array(payload.byteLength);
    copy.set(payload);
    worker.postMessage(['run', testCase, copy] satisfies InWorkerRequest, [copy.buffer]);
  } else {
    worker.postMessage(['run', testCase, payload] satisfies InWorkerRequest);
  }

  const response = await responsePromise;
  if (response[0] === 'error') {
    throw new Error(response[1]);
  }
  return response[1];
};

const terminateRunner = (worker: Worker): void => {
  worker.terminate();
};

describe('opfs in-worker SqliteClient browser test', { timeout: 120_000, sequential: true }, () => {
  test('runs CRUD inside dedicated worker via SqliteClient.layerOpfs', async () => {
    const worker = spawnInWorkerTestRunner();
    try {
      await waitForRunnerReady(worker);
      const result = (await runInWorkerTest(worker, 'crud')) as { names: string[] };
      expect(result.names).toEqual(['Alice', 'Bob']);
    } finally {
      terminateRunner(worker);
    }
  });

  test('exports database inside worker via SqliteClient.layerOpfs', async () => {
    const worker = spawnInWorkerTestRunner();
    try {
      await waitForRunnerReady(worker);
      const result = (await runInWorkerTest(worker, 'export')) as { byteLength: number; valid: boolean };
      expect(result.byteLength).toBeGreaterThan(100);
      expect(result.valid).toBe(true);
    } finally {
      terminateRunner(worker);
    }
  });

  test('imports snapshot inside worker via SqliteClient.layerOpfs', async () => {
    const source = await createSerializedDatabase('in-worker-import');
    expect(isValidSqliteDatabase(source)).toBe(true);

    const worker = spawnInWorkerTestRunner();
    try {
      await waitForRunnerReady(worker);
      const result = (await runInWorkerTest(worker, 'import', source)) as { label: string };
      expect(result.label).toBe('in-worker-import');
    } finally {
      terminateRunner(worker);
    }
  });

  test('exports and re-imports inside worker via SqliteClient.layerOpfs', async () => {
    const worker = spawnInWorkerTestRunner();
    try {
      await waitForRunnerReady(worker);
      const result = (await runInWorkerTest(worker, 'import-roundtrip')) as { value: string };
      expect(result.value).toBe('roundtrip');
    } finally {
      terminateRunner(worker);
    }
  });

  test('persists OPFS data across in-worker client restart', async () => {
    const marker = `in-worker-persist-${crypto.randomUUID()}`;

    const writeWorker = spawnInWorkerTestRunner();
    try {
      await waitForRunnerReady(writeWorker);
      const written = (await runInWorkerTest(writeWorker, 'persist-write', marker)) as { written: string };
      expect(written.written).toBe(marker);
    } finally {
      terminateRunner(writeWorker);
    }

    const readWorker = spawnInWorkerTestRunner();
    try {
      await waitForRunnerReady(readWorker);
      const read = (await runInWorkerTest(readWorker, 'persist-read')) as { marker: string };
      expect(read.marker).toBe(marker);
    } finally {
      terminateRunner(readWorker);
    }
  });
});
