//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { RoutineCapabilities } from '@dxos/plugin-routine';

// Server-safe `#capabilities` barrel: the subset of modules the workerd entry activates,
// declared without importing browser-only capability packages (so the workerd bundle stays
// free of them). The browser/node entries use the full `./index.ts` barrel via `default`.

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

export const Toolkit = Capability.lazyModule('toolkit', { provides: [AppCapabilities.Toolkit] }, () =>
  import('./toolkit'),
);
