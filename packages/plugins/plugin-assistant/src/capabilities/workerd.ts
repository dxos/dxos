//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

// Server-safe `#capabilities` barrel: the subset of modules the workerd entry activates,
// declared without importing browser-only capability packages (so the workerd bundle stays
// free of them). The browser/node entries use the full `./index.ts` barrel via `default`.

// Not `AppCapability.schema`: the list depends on `experimentalTypes`, and only a module body sees
// the plugin's options. The workerd entry passes none, so it registers everything.
export const Schema = Capability.lazyModule(
  'schema',
  { provides: [AppCapabilities.Schema] },
  () => import('./schema-defs'),
);
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

export const OperationHandler = Capability.lazyModule(
  'operation-handler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);

export const Toolkit = Capability.lazyModule(
  'toolkit',
  { provides: [AppCapabilities.Toolkit] },
  () => import('./toolkit'),
);
