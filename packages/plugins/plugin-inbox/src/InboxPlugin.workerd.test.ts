//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import * as InboxPlugin from './InboxPlugin.ts';
import { InboxOperation, Mailbox } from './types/index.ts';

describe('InboxPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([InboxPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(InboxOperation.ReadEmail.meta.key));
    expect(typenames).toContain(Type.getTypename(Mailbox.Mailbox));
  });
});
