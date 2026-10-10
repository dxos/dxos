//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import { Map, MapOperation } from '#types';

import * as MapPlugin from './MapPlugin.ts';

describe('MapPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([MapPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(MapOperation.SetControlType.meta.key));
    expect(typenames).toContain(Type.getTypename(Map.Map));
  });
});
