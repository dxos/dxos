//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

// Declared here rather than imported from `#capabilities`: that barrel declares `ReactContext` and
// `ReactSurface`, and a bundler follows the dynamic import behind a lazy capability, so touching it
// drags React into a worker bundle that cannot load it. This plugin is a common transitive
// dependency — plugin-space reaches it through its own operations — so the leak propagated well
// beyond here.
const OperationHandler = AppCapability.operationHandler(() => import('./capabilities/operation-handler'));

export const ClientPlugin = Plugin.define(meta).pipe(Plugin.addModule(OperationHandler), Plugin.make);

export default ClientPlugin;
