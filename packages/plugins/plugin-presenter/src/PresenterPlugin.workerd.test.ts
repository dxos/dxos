//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import { Presentation, PresenterOperation } from '#types';

import * as PresenterPlugin from './PresenterPlugin.ts';

describe('PresenterPlugin in workerd', () => {
  test('activates headless and contributes its skill, operations and types', async ({ expect }) => {
    const { failures, operationKeys, skillKeys, typenames } = await activateHeadlessPlugins([PresenterPlugin.make()]);
    expect(failures).toEqual([]);
    expect(skillKeys).toContain(Presentation.SKILL_KEY);
    expect(operationKeys).toContain(String(PresenterOperation.CreatePresentation.meta.key));
    expect(typenames).toContain(Type.getTypename(Presentation.Presentation));
  });

  test("loads the handlers behind the skill's tools", async ({ expect }) => {
    const modules = await Promise.all([
      import('./operations/add-section.ts'),
      import('./operations/create-presentation.ts'),
      import('./operations/generate-slide-image.ts'),
      import('./operations/list-layouts.ts'),
      import('./operations/present-object.ts'),
    ]);
    expect(modules.every((module) => module.default !== undefined)).toBe(true);
  });
});
