//
// Copyright 2025 DXOS.org
//

import { LayoutOperation } from '@dxos/app-toolkit';
import { templates } from '@dxos/assistant';
import { Skill } from '@dxos/compute';

import { AssistantOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.assistant';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Assistant',
    tools: Skill.toolDefinitions({
      // TODO(wittjosiah): LayoutOperation.Open requires Capability.Service which is only available
      //   via the compute-runtime layer (plugin-routine). Once Capability.Service is propagated
      //   through LocalFunctionExecutionService, this will work without the compute-runtime dependency.
      operations: [LayoutOperation.Open, AssistantOperation.ResolveNavigationTargets],
    }),
    instructions: templates.system,
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
