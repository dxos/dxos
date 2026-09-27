//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';

import * as JmapPlugin from './JmapPlugin.ts';
import * as JmapOperationHandlerSet from './operations/JmapOperationHandlerSet.ts';
import { JmapOperation } from './types/index.ts';

describe('JmapPlugin in workerd', () => {
  test('activates headless and contributes its operations', async ({ expect }) => {
    const { failures, operationKeys } = await activateHeadlessPlugins([JmapPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(JmapOperation.JmapSync.meta.key));
  });

  test('exports its operation handler set', async ({ expect }) => {
    const keys = (await JmapOperationHandlerSet.handlers.getHandlers()).map((handler) => String(handler.meta.key));
    expect(keys).toContain(String(JmapOperation.JmapSync.meta.key));
  });
});
