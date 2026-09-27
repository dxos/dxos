//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import * as IllustratorPlugin from './IllustratorPlugin.ts';
import { Drawing, DrawingOperation } from './types/index.ts';

describe('IllustratorPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([IllustratorPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(DrawingOperation.Create.meta.key));
    expect(typenames).toContain(Type.getTypename(Drawing.Drawing));
    expect(typenames).toContain(Type.getTypename(Drawing.Canvas));
  });
});
