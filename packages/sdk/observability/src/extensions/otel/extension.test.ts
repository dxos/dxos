//
// Copyright 2026 DXOS.org
//

import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';

import { Config } from '@dxos/config';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import { createResources, extensions } from './extension';

const OtelLogs = vi.fn();
const OtelMetrics = vi.fn();
const OtelTraces = vi.fn();

// Records the processor list at the moment the opt-out is written, which is what the ordering
// assertion below reads.
let processorsWhenStored: unknown[] = [];

vi.mock('../../storage', () => ({
  isObservabilityDisabled: async () => false,
  getOtelLogLevel: async () => null,
  storeObservabilityDisabled: async () => {
    processorsWhenStored = [...log.runtimeConfig.processors];
  },
}));

vi.mock('./logs', () => ({
  OtelLogs: class {
    public readonly logProcessor = () => {};
    constructor(...args: unknown[]) {
      OtelLogs(...args);
    }

    close() {
      return Promise.resolve();
    }
  },
}));
vi.mock('./metrics', () => ({
  OtelMetrics: class {
    constructor(...args: unknown[]) {
      OtelMetrics(...args);
    }

    close() {
      return Promise.resolve();
    }
  },
}));
vi.mock('./traces', () => ({
  OtelTraces: class {
    constructor(...args: unknown[]) {
      OtelTraces(...args);
    }

    start() {}
    close() {
      return Promise.resolve();
    }
  },
}));

describe('createResources', () => {
  const attributes = { [ATTR_SERVICE_NAME]: 'composer', 'deployment.environment': 'test' };

  test('session.id is present on logs/traces and absent from metrics', () => {
    const { resource, metricsResource } = createResources(attributes, 'session-1');

    // A per-page-load attribute on a metric mints a new time series on every reload.
    expect(resource.attributes['session.id']).toEqual('session-1');
    expect(metricsResource.attributes['session.id']).toBeUndefined();
  });

  test('both resources carry the shared attributes', () => {
    const { resource, metricsResource } = createResources(attributes, 'session-1');

    for (const [key, value] of Object.entries(attributes)) {
      expect(resource.attributes[key]).toEqual(value);
      expect(metricsResource.attributes[key]).toEqual(value);
    }
  });
});

describe('otel extension', () => {
  const namespaceDir = mkdtempSync(join(tmpdir(), 'otel-extension-test-'));

  afterAll(() => rmSync(namespaceDir, { recursive: true, force: true }));

  afterEach(() => {
    delete process.env.DX_DISABLE_OBSERVABILITY;
    vi.clearAllMocks();
  });

  test('builds an exporter for every signal it was asked for', async () => {
    await make();

    expect(OtelLogs).toHaveBeenCalledTimes(1);
    expect(OtelMetrics).toHaveBeenCalledTimes(1);
    expect(OtelTraces).toHaveBeenCalledTimes(1);
  });

  // The processor does not consult the enabled flag, so anything logged while the opt-out is being
  // written would still reach the queue that the shutdown drains.
  test('detaches the log processor before the opt-out is written', async () => {
    processorsWhenStored = [];
    const extension = await make();
    await EffectEx.runPromise(extension.initialize!({ setTags: () => {} }));
    expect(log.runtimeConfig.processors).to.have.length.greaterThan(0);
    const processor = log.runtimeConfig.processors.at(-1);

    await EffectEx.runPromise(extension.disable!());

    expect(processorsWhenStored).to.not.include(processor);
    expect(log.runtimeConfig.processors).to.not.include(processor);
  });

  test('builds nothing once the user has opted out', async () => {
    process.env.DX_DISABLE_OBSERVABILITY = 'true';
    const extension = await make();

    expect(OtelLogs).not.toHaveBeenCalled();
    expect(OtelMetrics).not.toHaveBeenCalled();
    expect(OtelTraces).not.toHaveBeenCalled();
    expect(extension.enabled).to.be.false;
  });

  const make = () =>
    EffectEx.runPromise(
      extensions({
        serviceName: 'dx',
        serviceVersion: '1.2.3',
        environment: 'test',
        namespace: namespaceDir,
        config: new Config({}),
        endpoint: 'http://127.0.0.1:1',
        logs: true,
        metrics: true,
        traces: true,
      }),
    );
});
