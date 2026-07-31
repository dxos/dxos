//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  Credential,
  FunctionNotFoundError,
  Instructions,
  Operation,
  OperationHandlerSet,
  OperationRegistry,
  Process,
  Runnable,
  Script,
  ServiceResolver,
  Skill,
  StorageService,
  Template,
  Trace,
  Trigger,
  TriggerEvent,
} from './index';

describe('umbrella re-exports', () => {
  test('top-level re-exports preserve source-package namespace nesting', ({ expect }) => {
    // Operation primitives.
    expect(Operation).toBeDefined();
    expect(OperationHandlerSet).toBeDefined();
    expect(OperationRegistry).toBeDefined();

    // Skill primitives.
    expect(Skill).toBeDefined();
    expect(Skill.make).toBeTypeOf('function');
    expect(Instructions).toBeDefined();
    expect(Template).toBeDefined();

    // Function primitives.
    expect(Process).toBeDefined();
    expect(Runnable).toBeDefined();
    expect(Trigger).toBeDefined();
    expect(TriggerEvent).toBeDefined();
    expect(Script).toBeDefined();
    expect(Trace).toBeDefined();
    expect(ServiceResolver).toBeDefined();
    expect(StorageService).toBeDefined();
    expect(Credential).toBeDefined();

    // Error classes exported top-level.
    expect(FunctionNotFoundError).toBeDefined();
  });
});
