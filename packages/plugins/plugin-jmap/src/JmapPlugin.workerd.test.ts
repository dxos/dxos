//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { JmapOperation } from '#types';

import * as JmapPlugin from './JmapPlugin.ts';

// Activation and the handler set are not covered: the handlers import `@dxos/pipeline-rdf`, whose
// comunica dependency requires `process/`, a specifier the vitest workerd pool cannot resolve
// (wrangler bundles it).
describe('JmapPlugin in workerd', () => {
  test('exports its plugin and operations', ({ expect }) => {
    expect(String(JmapPlugin.meta.profile.key)).toBe('org.dxos.plugin.jmap');
    expect(String(JmapOperation.JmapSync.meta.key)).toBe('dxn:org.dxos.operation.jmap.sync');
  });
});
