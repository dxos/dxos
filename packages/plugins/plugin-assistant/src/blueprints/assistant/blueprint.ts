//
// Copyright 2025 DXOS.org
//

import { LayoutOperation, type AppCapabilities } from '@dxos/app-toolkit';
import { templates } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';

import { AssistantOperation } from '../../operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.assistant';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Assistant',
    tools: Blueprint.toolDefinitions({
      // TODO(wittjosiah): LayoutOperation.Open requires Capability.Service which is only available
      //   via the compute-runtime layer (plugin-automation). Once Capability.Service is propagated
      //   through LocalFunctionExecutionService, this will work without the compute-runtime dependency.
      operations: [LayoutOperation.Open, AssistantOperation.ResolveNavigationTargets],
    }),
    instructions: templates.system,
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
