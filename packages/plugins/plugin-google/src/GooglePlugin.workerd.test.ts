//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { GoogleOperation } from '#types';

import * as GooglePlugin from './GooglePlugin.ts';

// Activation and the handler set are not covered: the handlers import `@dxos/pipeline-rdf`, whose
// comunica dependency requires `process/`, a specifier the vitest workerd pool cannot resolve
// (wrangler bundles it).
describe('GooglePlugin in workerd', () => {
  test('exports its plugin and operations', ({ expect }) => {
    expect(String(GooglePlugin.meta.profile.key)).toBe('org.dxos.plugin.google');
    expect(String(GoogleOperation.GoogleMailSync.meta.key)).toBe('dxn:org.dxos.operation.google.syncMail');
  });
});
