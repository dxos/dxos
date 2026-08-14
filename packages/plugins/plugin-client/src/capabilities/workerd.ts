//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Server-safe `#capabilities` barrel: only the modules the workerd entry activates. Declared here
// rather than re-exported from `./index.ts`, because that barrel also declares `ReactContext` and
// `ReactSurface`, and a bundler follows the dynamic import behind a lazy capability — so importing
// it at all pulls React into a worker bundle that cannot load it. This plugin is a common
// transitive dependency (plugin-space reaches it through its own operations), so that leak
// propagated well beyond here. The browser and node entries keep using their own barrels.

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
