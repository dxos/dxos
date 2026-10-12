//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { BrainSkill } from '#skills';
import { AgentOperation, MemoryOperation, ModeOperation, RelayOperation, TriggerOperation } from '#types';

export const AgentOperationHandlerSet = OperationHandlerSet.lazy([
  AgentOperation.CreateAgent.pipe(Operation.lazyHandler(() => import('./create-agent.ts'))),
  AgentOperation.EnsureChannelChat.pipe(Operation.lazyHandler(() => import('./ensure-channel-chat.ts'))),
  AgentOperation.ListAgents.pipe(Operation.lazyHandler(() => import('./list-agents.ts'))),
  AgentOperation.ListSkills.pipe(Operation.lazyHandler(() => import('./list-skills.ts'))),
  AgentOperation.CustomizeSkill.pipe(Operation.lazyHandler(() => import('./customize-skill.ts'))),
  AgentOperation.ResetSkill.pipe(Operation.lazyHandler(() => import('./reset-skill.ts'))),
  AgentOperation.EnsureParticipantChat.pipe(Operation.lazyHandler(() => import('./ensure-participant-chat.ts'))),
  AgentOperation.OpenPrivateChat.pipe(Operation.lazyHandler(() => import('./open-private-chat.ts'))),
  AgentOperation.ReadSource.pipe(Operation.lazyHandler(() => import('./read-source.ts'))),
  ModeOperation.ListModes.pipe(Operation.lazyHandler(() => import('./list-modes.ts'))),
  ModeOperation.SwitchMode.pipe(Operation.lazyHandler(() => import('./switch-mode.ts'))),
  MemoryOperation.ResolveEntity.pipe(Operation.lazyHandler(() => import('./resolve-entity.ts'))),
  MemoryOperation.Remember.pipe(Operation.lazyHandler(() => import('./remember.ts'))),
  MemoryOperation.Recall.pipe(Operation.lazyHandler(() => import('./recall.ts'))),
  MemoryOperation.ProposeGoal.pipe(Operation.lazyHandler(() => import('./propose-goal.ts'))),
  MemoryOperation.ConfirmGoal.pipe(Operation.lazyHandler(() => import('./confirm-goal.ts'))),
  MemoryOperation.UpdateProfile.pipe(Operation.lazyHandler(() => import('./update-profile.ts'))),
  RelayOperation.CreateRelay.pipe(Operation.lazyHandler(() => import('./create-relay.ts'))),
  RelayOperation.UpdateRelay.pipe(Operation.lazyHandler(() => import('./update-relay.ts'))),
  RelayOperation.ListRelays.pipe(Operation.lazyHandler(() => import('./list-relays.ts'))),
  RelayOperation.SendMessage.pipe(Operation.lazyHandler(() => import('./send-message.ts'))),
  RelayOperation.AssignChatParticipant.pipe(Operation.lazyHandler(() => import('./assign-chat-participant.ts'))),
  TriggerOperation.WatchFacts.pipe(Operation.lazyHandler(() => import('./watch-facts.ts'))),
  TriggerOperation.ListTriggers.pipe(Operation.lazyHandler(() => import('./list-triggers.ts'))),
  TriggerOperation.CancelTrigger.pipe(Operation.lazyHandler(() => import('./cancel-trigger.ts'))),
  TriggerOperation.RunDue.pipe(Operation.lazyHandler(() => import('./run-due.ts'))),
  TriggerOperation.InspectBrain.pipe(Operation.lazyHandler(() => import('./inspect-brain.ts'))),
  BrainSkill.RunTriggers.pipe(Operation.lazyHandler(() => import('./run-triggers.ts'))),
]);
