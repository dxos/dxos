//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';
import { type ContentBlock } from '@dxos/types';

import type { SandboxOperation } from './Dialect.ts';
import { EVAL_TOOL_NAME, describeEvalCall } from './eval-tool.ts';

const makeOperation = (name: string, key: string, title: string, icon?: string): SandboxOperation => ({
  name,
  parameters: {},
  definition: Operation.make({
    input: Schema.Void,
    output: Schema.Void,
    meta: { key: DXN.make(key), name: title, icon },
  }),
  invoke: () => Effect.void,
});

const OPERATIONS = [
  makeOperation('create-task', 'com.example.operation.createTask', 'Create task', 'ph--plus--regular'),
  makeOperation('create-task-list', 'com.example.operation.createTaskList', 'Create task list'),
  makeOperation('update-task', 'com.example.operation.updateTask', 'Update task'),
];

const evalCall = (code: string): ContentBlock.ToolCall => ({
  _tag: 'toolCall',
  toolCallId: 'call-1',
  name: EVAL_TOOL_NAME,
  input: JSON.stringify({ code }),
  providerExecuted: false,
});

const describeCall = describeEvalCall(OPERATIONS);

describe('describeEvalCall', () => {
  test('names a call after the one operation its code invokes', ({ expect }) => {
    const block = describeCall(evalCall(`await ops["create-task"]({ title: 'x' })`));
    expect(block.operationName).toBe('Create task');
    expect(block.operationIcon).toBe('ph--plus--regular');
    expect(block.operationKey).toBe(String(DXN.make('com.example.operation.createTask')));
  });

  test('matches the camelCase binding and the key', ({ expect }) => {
    expect(describeCall(evalCall('await ops.updateTask({})')).operationName).toBe('Update task');
    const key = String(DXN.make('com.example.operation.updateTask'));
    expect(describeCall(evalCall(`yield* Database.resolve('${key}')`)).operationName).toBe('Update task');
  });

  test('does not match an operation whose name prefixes another', ({ expect }) => {
    expect(describeCall(evalCall('await ops["create-task-list"]({})')).operationName).toBe('Create task list');
  });

  test('lists several operations in the order the code invokes them', ({ expect }) => {
    const block = describeCall(evalCall('await ops.updateTask({}); await ops.createTask({})'));
    expect(block.operationName).toBe('Update task, Create task');
    expect(block.operationKey).toBeUndefined();
    expect(block.operationIcon).toBeUndefined();
  });

  test('names a call whose input is still streaming', ({ expect }) => {
    const block = describeCall({ ...evalCall(''), input: '{"code": "await ops.createTask(' });
    expect(block.operationName).toBe('Create task');
  });

  test('leaves a call that invokes no operation unnamed', ({ expect }) => {
    expect(describeCall(evalCall(`print(await query('com.example.type.task'))`)).operationName).toBeUndefined();
  });
});
