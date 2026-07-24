//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';

import * as Project from './Project';

describe('Project', () => {
  test('typename, version, and defaults', ({ expect }) => {
    expect(Type.getTypename(Project.Project)).toBe('org.dxos.type.project');
    expect(Type.getVersion(Project.Project)).toBe('0.2.0');
    const project = Project.make({ name: 'test' });
    expect(Obj.instanceOf(Project.Project, project)).toBe(true);
    expect(project.routines).toEqual([]);
  });
});
