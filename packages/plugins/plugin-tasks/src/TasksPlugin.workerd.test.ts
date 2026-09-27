//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import * as TasksPlugin from './TasksPlugin.ts';

describe('TasksPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([TasksPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(TaskOperation.CreateTask.meta.key));
    expect(typenames).toContain(Type.getTypename(Task.Task));
    expect(typenames).toContain(Type.getTypename(TaskSet.TaskSet));
  });
});
