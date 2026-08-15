//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

// Workerd-specific implementations spliced into the generated barrel by `dx-plugin gen` in place
// of the canonical declarations: the workerd entry never contributes a `ReactSurface`, so
// `AssistantEvents.Start` (fired only when a plugin surface renders) never fires there — these
// register on the framework's idle-default instead so the workerd host still gets a toolkit and a
// skill. `SkillDefinition` also folds in the `Capabilities.OperationHandler` provide that the
// browser/node build gets from the separate `OperationHandler` module.
export const SkillDefinition = Capability.lazyModule(
  'skill-definition',
  {
    provides: [
      AppCapabilities.SkillDefinition,
      Capabilities.OperationHandler,
      RoutineCapabilities.AgentDelegationStrategy,
    ],
  },
  () => import('./skill-definition'),
);

export const Toolkit = Capability.lazyModule('toolkit', { provides: [AppCapabilities.Toolkit] }, () =>
  import('./toolkit'),
);
