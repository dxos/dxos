//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';

import { GoogleOperation } from '#types';

import * as GooglePlugin from './GooglePlugin.ts';
import * as GoogleOperationHandlerSet from './operations/GoogleOperationHandlerSet.ts';

describe('GooglePlugin in workerd', () => {
  test('activates headless and contributes its operations', async ({ expect }) => {
    const { failures, operationKeys } = await activateHeadlessPlugins([
      GooglePlugin.make(),
      // Declared plugin dependencies; the manager refuses to load the plugin without them.
      InboxPlugin.make(),
    ]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(GoogleOperation.GoogleMailSync.meta.key));
  });

  test('exports its operation handler set', async ({ expect }) => {
    const keys = (await GoogleOperationHandlerSet.handlers.getHandlers()).map((handler) => String(handler.meta.key));
    expect(keys).toContain(String(GoogleOperation.GoogleMailSync.meta.key));
  });
});
