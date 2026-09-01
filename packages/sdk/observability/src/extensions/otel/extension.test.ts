//
// Copyright 2026 DXOS.org
//

import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { describe, expect, test } from 'vitest';

import { createResources } from './extension.ts';

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
