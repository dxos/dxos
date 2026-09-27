//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import * as Project from '@dxos/compute/Project';
import { Type } from '@dxos/echo';

import { ProjectOperation } from '#types';

import * as ProjectsPlugin from './ProjectsPlugin.ts';

describe('ProjectsPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([ProjectsPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(ProjectOperation.Create.meta.key));
    expect(typenames).toContain(Type.getTypename(Project.Project));
  });
});
