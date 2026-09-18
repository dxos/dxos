//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppSurface } from '@dxos/app-toolkit/ui';

import * as DebugSurface from './DebugSurface.ts';

describe('DebugSurface', () => {
  test('Page addresses the article role the debug panel renders through', ({ expect }) => {
    expect(DebugSurface.Page.role).toBe(AppSurface.Article.role);
  });
});
