//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Type } from '@dxos/echo';

import { InboxOperation, Mailbox } from '#types';

import * as InboxPlugin from './InboxPlugin.ts';

// Activation is not covered: the handlers import `@dxos/pipeline-rdf`, whose comunica dependency
// requires `process/`, a specifier the vitest workerd pool cannot resolve (wrangler bundles it).
describe('InboxPlugin in workerd', () => {
  test('exports its plugin, operations and types', ({ expect }) => {
    expect(String(InboxPlugin.meta.profile.key)).toBe('org.dxos.plugin.inbox');
    expect(String(InboxOperation.ReadEmail.meta.key)).toBe('dxn:org.dxos.operation.inbox.readEmail');
    expect(Type.getTypename(Mailbox.Mailbox)).toBe('org.dxos.type.mailbox');
  });
});
