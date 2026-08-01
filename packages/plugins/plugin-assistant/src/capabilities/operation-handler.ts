//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import {
  AgentHandlers,
  AgentSkillHandlers,
  AgentWizardHandlers,
  AlarmHandlers,
  DatabaseHandlers,
  DelegationHandlers,
  PlanningHandlers,
  ProjectHandlers,
  SkillManagerHandlers,
  WebSearchHandlers,
} from '@dxos/assistant-toolkit';

import { AssistantOperationHandlerSet } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(Capabilities.OperationHandler, [
      AssistantOperationHandlerSet,
      // Toolkit handler sets register here (eagerly) rather than with the SkillsRequested-gated
      // skill definitions: their operations (e.g. runInstructions) are invoked headlessly by
      // triggers, before any toolkit materialization fires the skills gate. The sets are
      // lazy-bodied, so eager registration costs only the definition map.
      AgentHandlers,
      AgentSkillHandlers,
      SkillManagerHandlers,
      DatabaseHandlers,
      WebSearchHandlers,
      AgentWizardHandlers,
      DelegationHandlers,
      PlanningHandlers,
      AlarmHandlers,
      ProjectHandlers,
    ]);
  }),
);
