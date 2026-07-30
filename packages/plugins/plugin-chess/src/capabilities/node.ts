//
// Copyright 2026 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';

// The capabilities `ChessPlugin.node` activates, and only those. A lazy module defers its import at
// runtime but a bundler still walks it, so listing the React surfaces here — including `GameVariant`,
// which contributes them — would pull the plugin's components into every node and bun build.

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
