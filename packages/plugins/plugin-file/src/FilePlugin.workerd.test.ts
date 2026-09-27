//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import { File } from '@dxos/types';

import * as FilePlugin from './FilePlugin.ts';
import { FileOperation } from './types/index.ts';

describe('FilePlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([FilePlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(FileOperation.CreateFromUpload.meta.key));
    expect(typenames).toContain(Type.getTypename(File.File));
  });
});
