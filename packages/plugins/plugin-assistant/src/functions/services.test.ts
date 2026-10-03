//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as AgentOperationHandlerSet from '@dxos/assistant-toolkit/AgentOperationHandlerSet';
import * as AgentSkill from '@dxos/assistant-toolkit/AgentSkill';
import * as ChatContextSkill from '@dxos/assistant-toolkit/ChatContextSkill';
import * as DelegationSkill from '@dxos/assistant-toolkit/DelegationSkill';
import * as SkillManagerSkill from '@dxos/assistant-toolkit/SkillManagerSkill';
import * as WebSearchSkill from '@dxos/assistant-toolkit/WebSearchSkill';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as EffectEx from '@dxos/effect/EffectEx';

import { AssistantOperationHandlerSet } from '#operations';

const handlerSet = OperationHandlerSet.merge(
  AssistantOperationHandlerSet,
  AgentOperationHandlerSet.handlers,
  AgentSkill.Handlers,
  SkillManagerSkill.Handlers,
  ChatContextSkill.Handlers,
  WebSearchSkill.Handlers,
  DelegationSkill.Handlers,
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
