//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Type } from '@dxos/echo';

import * as TaskSet from './TaskSet';

describe('TaskSet', () => {
  test('typename, version, and array defaults', ({ expect }) => {
    expect(Type.getTypename(TaskSet.TaskSet)).toBe('org.dxos.type.taskSet');
    expect(Type.getVersion(TaskSet.TaskSet)).toBe('0.3.0');
    const taskSet = TaskSet.make({ name: 'Work' });
    expect(taskSet.tasks).toEqual([]);
    expect(taskSet.milestones).toEqual([]);
  });
});
