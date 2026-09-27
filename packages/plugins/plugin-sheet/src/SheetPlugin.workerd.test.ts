//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import * as SheetPlugin from './SheetPlugin.ts';
import { Sheet, SheetOperation } from './types/index.ts';

describe('SheetPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([SheetPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(SheetOperation.Create.meta.key));
    expect(typenames).toContain(Type.getTypename(Sheet.Sheet));
  });
});
