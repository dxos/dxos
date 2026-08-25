//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// A node-conditioned barrel, because the browser one reaches the plugin's React containers through
// its app-graph builder and the CLI entrypoint must stay loadable without a DOM. Lazy module bodies
// do not help: the bundler still walks the static graph of whichever barrel it resolves.
export const Commands = AppCapability.commands(() => import('./commands'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
