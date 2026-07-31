//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import { templates } from '@dxos/assistant';
import * as Skill from '@dxos/compute/Skill';

const SKILL_KEY = 'org.dxos.skill.assistant';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Assistant',
    tools: Skill.toolDefinitions({
      // TODO(wittjosiah): LayoutOperation.Open requires Capability.Service which is only available
      //   via the compute-runtime layer (plugin-routine). Once Capability.Service is propagated
      //   through the process operation runtime, this will work without the compute-runtime dependency.
      operations: [LayoutOperation.Open, NavigationOperation.ResolveNavigationTargets],
    }),
    instructions: templates.system,
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
