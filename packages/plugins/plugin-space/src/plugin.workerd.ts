//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { HasConnection, Person } from '@dxos/types';

import { meta } from '#meta';

// Declared here rather than imported from `#capabilities`: that barrel pulls the React surface
// into worker bundles.
const OperationHandler = AppCapability.operationHandler(() => import('./capabilities/operation-handler'));

export const SpacePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema.workerd'))),
  Plugin.make,
);

export default SpacePlugin;
