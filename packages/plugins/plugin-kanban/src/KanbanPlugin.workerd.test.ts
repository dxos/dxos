//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import * as KanbanPlugin from './KanbanPlugin.ts';
import { Kanban, KanbanOperation } from './types/index.ts';

describe('KanbanPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([KanbanPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(KanbanOperation.DeleteCard.meta.key));
    expect(typenames).toContain(Type.getTypename(Kanban.Kanban));
  });
});
