//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Blueprint } from './Blueprint';
import * as Operation from './Operation';
import { Process } from './Process';
import { Prompt } from './Prompt';
import { Script } from './Script';
import { ServiceResolver } from './ServiceResolver';
import { StorageService } from './StorageService';
import { Template } from './Template';
import * as Trace from './Trace';
import { Trigger, TriggerEvent } from './Trigger';

describe('umbrella submodules', () => {
  test('each submodule re-exports a defined value', ({ expect }) => {
    expect(Operation).toBeDefined();
    expect(Blueprint).toBeDefined();
    expect(Prompt).toBeDefined();
    expect(Template).toBeDefined();
    expect(Trigger).toBeDefined();
    expect(TriggerEvent).toBeDefined();
    expect(Script).toBeDefined();
    expect(Process).toBeDefined();
    expect(Trace).toBeDefined();
    expect(ServiceResolver).toBeDefined();
    expect(StorageService).toBeDefined();
  });
});
