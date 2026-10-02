//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';

import { JmapOperation } from '#types';

import * as JmapPlugin from './JmapPlugin.ts';
import * as JmapOperationHandlerSet from './operations/JmapOperationHandlerSet.ts';

describe('JmapPlugin in workerd', () => {
  test('activates headless and contributes its operations', async ({ expect }) => {
    const { failures, operationKeys } = await activateHeadlessPlugins([
      JmapPlugin.make(),
      // Declared plugin dependencies; the manager refuses to load the plugin without them.
      InboxPlugin.make(),
    ]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(JmapOperation.JmapSync.meta.key));
  });

  test('exports its operation handler set', async ({ expect }) => {
    const keys = (await JmapOperationHandlerSet.handlers.getHandlers()).map((handler) => String(handler.meta.key));
    expect(keys).toContain(String(JmapOperation.JmapSync.meta.key));
  });
});
