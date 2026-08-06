//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Server-safe `#capabilities` barrel: the subset of modules the workerd entry activates. A lazy
// module defers its import at runtime but a bundler still walks it, so listing the surface,
// app-graph and create-object modules here would pull React into the workerd bundle. The browser
// entry uses the full `./index.ts` barrel via `default`.

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
