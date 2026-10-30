//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import { Task } from '@dxos/types';

import * as SpacePlugin from '#meta';
import { SpaceOperation } from '#types';

describe('SpacePlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([SpacePlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(SpaceOperation.AddObject.meta.key));
    expect(typenames).toContain(Type.getTypename(Task.Task));
  });
});
