//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import { templates } from '@dxos/assistant';
import * as Skill from '@dxos/compute/Skill';

export const key = 'org.dxos.skill.assistant';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Assistant',
    tools: Skill.toolDefinitions({
      // TODO(wittjosiah): LayoutOperation.Open requires Capability.Service which is only available
      //   via the compute-runtime layer (plugin-routine). Once Capability.Service is propagated
      //   through the process operation runtime, this will work without the compute-runtime dependency.
      operations: [LayoutOperation.Open, NavigationOperation.ResolveNavigationTargets],
    }),
    instructions: templates.system,
  });
