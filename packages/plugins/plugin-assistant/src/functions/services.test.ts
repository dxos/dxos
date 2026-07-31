//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import {
  AgentHandlers,
  AgentSkillHandlers,
  AgentWizardHandlers,
  DatabaseHandlers,
  DelegationHandlers,
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
  DatabaseHandlers,
  WebSearchHandlers,
  AgentWizardHandlers,
  DelegationHandlers,
);

describe('operation registry round-trip', () => {
  test('LayoutOperation.Open input survives serialization', ({ expect }) => {
    const record = Operation.serialize(LayoutOperation.Open);
    const restored = Operation.deserialize(record);
    expect(restored.input.ast._tag).toBe('TypeLiteral');
  });

  test('assistant plugin operation inputs deserialize to struct-like schemas', async ({ expect }) => {
    const handlers = await EffectEx.runPromise(handlerSet.handlers);
    const failures: string[] = [];
    for (const operation of handlers) {
      const record = Operation.serialize(operation);
      const restored = Operation.deserialize(record);
      const tag = restored.input.ast._tag;
      if (tag !== 'TypeLiteral' && tag !== 'VoidKeyword') {
        failures.push(`${operation.meta.key}: ${tag}`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
