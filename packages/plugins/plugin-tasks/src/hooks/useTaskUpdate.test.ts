//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Operation from '@dxos/compute/Operation';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

import { applyPersonEdit } from './useTaskUpdate.ts';

const makeInvoker = (failing: readonly Operation.Definition.Any[] = []) => {
  const invoked: Operation.Definition.Any[] = [];
  const invoke = async (op: Operation.Definition.Any) => {
    invoked.push(op);
    return failing.includes(op) ? { error: new Error('Refused.') } : {};
  };
  return { invoked, invoke };
};

describe('applyPersonEdit', () => {
  test("a person's done is a sign-off, after the patch's other fields", async ({ expect }) => {
    const { invoked, invoke } = makeInvoker();
    await applyPersonEdit(invoke, Task.make({ title: 'Draft' }), { status: 'done', priority: 'high' }, undefined);
    expect(invoked).toEqual([TaskOperation.UpdateTask, TaskOperation.AcceptTask]);
  });

  test('a refused update signs nothing off', async ({ expect }) => {
    const { invoked, invoke } = makeInvoker([TaskOperation.UpdateTask]);
    await applyPersonEdit(invoke, Task.make({ title: 'Draft' }), { status: 'done', priority: 'high' }, undefined);
    expect(invoked).toEqual([TaskOperation.UpdateTask]);
  });
});
