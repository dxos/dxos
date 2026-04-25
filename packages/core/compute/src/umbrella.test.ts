//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  Blueprint,
  Operation,
  OperationHandlerSet,
  OperationInvoker,
  OperationRegistry,
  Process,
  Prompt,
  Script,
  ServiceResolver,
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
    expect(OperationInvoker).toBeDefined();
    expect(OperationHandlerSet).toBeDefined();
    expect(OperationRegistry).toBeDefined();

    // Blueprint primitives.
    expect(Blueprint).toBeDefined();
    expect(Blueprint.make).toBeTypeOf('function');
    expect(Prompt).toBeDefined();
    expect(Template).toBeDefined();

    // Function primitives.
    expect(Process).toBeDefined();
    expect(Trigger).toBeDefined();
    expect(TriggerEvent).toBeDefined();
    expect(Script).toBeDefined();
    expect(Trace).toBeDefined();
    expect(ServiceResolver).toBeDefined();
    expect(StorageService).toBeDefined();
  });
});
