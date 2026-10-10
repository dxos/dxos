//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import { FeedOperation, Magazine } from '#types';

import * as MagazinePlugin from './MagazinePlugin.ts';

describe('MagazinePlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([MagazinePlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(FeedOperation.SyncFeed.meta.key));
    expect(typenames).toContain(Type.getTypename(Magazine.Magazine));
  });
});
