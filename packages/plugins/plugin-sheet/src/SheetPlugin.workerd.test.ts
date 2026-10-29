//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import * as SheetPlugin from '#meta';
import { Sheet, SheetOperation } from '#types';

describe('SheetPlugin in workerd', () => {
  test('activates headless and contributes its skill, operations and types', async ({ expect }) => {
    const { failures, operationKeys, skillKeys, typenames } = await activateHeadlessPlugins([SheetPlugin.make()]);
    expect(failures).toEqual([]);
    expect(skillKeys).toContain(Sheet.SKILL_KEY);
    expect(operationKeys).toContain(String(SheetOperation.Create.meta.key));
    expect(typenames).toContain(Type.getTypename(Sheet.Sheet));
  });
});
