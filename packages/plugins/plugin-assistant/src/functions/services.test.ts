//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { LayoutOperation } from '@dxos/app-toolkit';
import {
  AgentBlueprintHandlers,
  AgentHandlers,
  AgentWizardHandlers,
  BlueprintManagerHandlers,
  DatabaseHandlers,
  DelegationHandlers,
  WebSearchHandlers,
} from '@dxos/assistant-toolkit';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { EffectEx } from '@dxos/effect';

import { AssistantOperationHandlerSet } from '#operations';

const handlerSet = OperationHandlerSet.merge(
  AssistantOperationHandlerSet,
  AgentHandlers,
  AgentBlueprintHandlers,
  BlueprintManagerHandlers,
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
