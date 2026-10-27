//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AgentOperationHandlerSet from '@dxos/assistant-toolkit/AgentOperationHandlerSet';
import * as AgentSkill from '@dxos/assistant-toolkit/AgentSkill';
import * as AlarmSkill from '@dxos/assistant-toolkit/AlarmSkill';
import * as ChatContextSkill from '@dxos/assistant-toolkit/ChatContextSkill';
import * as DelegationSkill from '@dxos/assistant-toolkit/DelegationSkill';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as SkillManagerSkill from '@dxos/assistant-toolkit/SkillManagerSkill';
import * as WebSearchSkill from '@dxos/assistant-toolkit/WebSearchSkill';

import { AssistantOperationHandlerSet } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(Capabilities.OperationHandler, [
      AssistantOperationHandlerSet,
      // Toolkit handler sets register here (eagerly) rather than with the start-gated skill
      // definitions: their operations (e.g. runInstructions) are invoked headlessly by
      // triggers, before any toolkit materialization fires the assistant's start event. The
      // sets are lazy-bodied, so eager registration costs only the definition map.
      AgentOperationHandlerSet.handlers,
      AgentSkill.Handlers,
      SkillManagerSkill.Handlers,
      ChatContextSkill.Handlers,
      WebSearchSkill.Handlers,
      DelegationSkill.Handlers,
      PlanningSkill.Handlers,
      AlarmSkill.Handlers,
    ]);
  }),
);
