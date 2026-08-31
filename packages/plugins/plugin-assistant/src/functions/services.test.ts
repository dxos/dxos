//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import {
  AgentHandlers,
  AgentSkillHandlers,
  ChatContextHandlers,
  DelegationSkillHandlers,
  SkillManagerHandlers,
  WebSearchHandlers,
} from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { EffectEx } from '@dxos/effect';

import { AssistantOperationHandlerSet } from '#operations';

const handlerSet = OperationHandlerSet.merge(
  AssistantOperationHandlerSet,
  AgentHandlers,
  AgentSkillHandlers,
  SkillManagerHandlers,
  ChatContextHandlers,
  WebSearchHandlers,
  DelegationSkillHandlers,
);

describe('operation registry round-trip', () => {
  test('LayoutOperation.Open input survives serialization', ({ expect }) => {
    const record = Operation.serialize(LayoutOperation.Open);
    const restored = Operation.deserialize(record);
    expect(restored.input.ast._tag).toBe('Objects');
  });

  test('assistant plugin operation inputs deserialize to struct-like schemas', async ({ expect }) => {
    const handlers = await EffectEx.runPromise(handlerSet.handlers);
    const failures: string[] = [];
    for (const operation of handlers) {
      const record = Operation.serialize(operation);
      const restored = Operation.deserialize(record);
      const tag = restored.input.ast._tag;
      if (tag !== 'Objects' && tag !== 'Void') {
        failures.push(`${operation.meta.key}: ${tag}`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
