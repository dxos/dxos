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

import { createResources, extensions } from './extension';

const OtelLogs = vi.fn();
const OtelMetrics = vi.fn();
const OtelTraces = vi.fn();

vi.mock('./logs', () => ({
  OtelLogs: class {
    constructor(...args: unknown[]) {
      OtelLogs(...args);
    }
  },
}));
vi.mock('./metrics', () => ({
  OtelMetrics: class {
    constructor(...args: unknown[]) {
      OtelMetrics(...args);
    }
  },
}));
vi.mock('./traces', () => ({
  OtelTraces: class {
    constructor(...args: unknown[]) {
      OtelTraces(...args);
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

  // Without an explicit namespace the consent read falls back to `serviceName`, which in node is a
  // directory relative to the cwd.
  test('builds an exporter for every signal it was asked for', async () => {
    await make();

    expect(OtelLogs).toHaveBeenCalledTimes(1);
    expect(OtelMetrics).toHaveBeenCalledTimes(1);
    expect(OtelTraces).toHaveBeenCalledTimes(1);
  });

  // A metric reader exports on its own schedule, so consent has to be honoured before one exists.
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
