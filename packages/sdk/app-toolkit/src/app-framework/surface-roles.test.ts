//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';

import { AppSurface } from '../ui/index.ts';
import * as AppCapabilities from './AppCapabilities.ts';
import * as AppCapability from './AppCapability.ts';

const Empty = () => null;

const surfaces = Capability.contribute(Capabilities.ReactSurface, [
  Surface.create({ id: 'article', filter: Surface.makeFilter(AppSurface.Article), component: Empty }),
  Surface.create({ id: 'grid', filter: Surface.makeFilter(AppSurface.CardMasonry), component: Empty }),
]);

describe('AppCapability.undeclaredSurfaceRoles', () => {
  test('names a role a surface binds but the module does not declare', ({ expect }) => {
    // The shape of the bug: requesting only the grid never loads the module.
    expect(AppCapability.undeclaredSurfaceRoles(surfaces, [AppSurface.Article.role])).toEqual([
      AppSurface.CardMasonry.role,
    ]);
  });

  test('is empty when every bound role is declared', ({ expect }) => {
    expect(
      AppCapability.undeclaredSurfaceRoles(surfaces, [AppSurface.Article.role, AppSurface.CardMasonry.role]),
    ).toEqual([]);
  });

  test('reads a module that contributes several capabilities, and ignores the others', ({ expect }) => {
    const translations = Capability.contribute(AppCapabilities.Translations, []);
    expect(AppCapability.undeclaredSurfaceRoles([surfaces, translations], [AppSurface.Article.role])).toEqual([
      AppSurface.CardMasonry.role,
    ]);
  });
});
