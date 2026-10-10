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
import { EVAL_TOOL_NAME, labelEvalCall } from './eval-tool.ts';

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

const labelCall = labelEvalCall(OPERATIONS);

describe('labelEvalCall', () => {
  test('names a call after the one operation its code invokes', ({ expect }) => {
    const label = labelCall(evalCall(`await ops["create-task"]({ title: 'x' })`));
    expect(label?.displayName).toBe('Create task');
    expect(label?.displayIcon).toBe('ph--plus--regular');
  });

  test('matches the camelCase binding and the key', ({ expect }) => {
    expect(labelCall(evalCall('await ops.updateTask({})'))?.displayName).toBe('Update task');
    const key = String(DXN.make('com.example.operation.updateTask'));
    expect(labelCall(evalCall(`yield* Database.resolve('${key}')`))?.displayName).toBe('Update task');
  });

  test('does not match an operation whose name prefixes another', ({ expect }) => {
    expect(labelCall(evalCall('await ops["create-task-list"]({})'))?.displayName).toBe('Create task list');
  });

  test('lists several operations in the order the code invokes them', ({ expect }) => {
    const label = labelCall(evalCall('await ops.updateTask({}); await ops.createTask({})'));
    expect(label?.displayName).toBe('Update task, Create task');
    expect(label?.displayIcon).toBeUndefined();
  });

  test('falls back to the raw input when it is not JSON', ({ expect }) => {
    const label = labelCall({ ...evalCall(''), input: '{"code": "await ops.createTask(' });
    expect(label?.displayName).toBe('Create task');
  });

  test('leaves a call that invokes no operation unnamed', ({ expect }) => {
    expect(labelCall(evalCall(`print(await query('com.example.type.task'))`))).toBeUndefined();
  });
});
