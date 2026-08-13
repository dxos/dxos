//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { RoutineCapabilities } from '#types';

// TODO(burdon): Proper fix is a `workerd` condition on `#capabilities` (a `capabilities/workerd.ts`
// barrel, as plugin-assistant and plugin-magazine already have) rather than reaching past the
// barrel into individual capability modules from here. That keeps the barrel the single place
// capabilities are declared; this file should go back to importing from `#capabilities`.
// Headless variant registered by workers (e.g. the edge operation-service): operations, schema and
// templates only. The capability modules are imported directly rather than through `#capabilities`
// — that barrel declares `ReactSurface`, and a bundler follows the dynamic import behind it, so
// touching the barrel drags the React surface (and `.pcss` assets a worker bundle cannot load) into
// the graph however lazy the capability is at runtime.
const OperationHandler = AppCapability.operationHandler(() => import('./capabilities/operation-handler'));
// CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
// provider must be present wherever the handler is exported.
const Templates = Capability.lazyModule(
  'Templates',
  { provides: [RoutineCapabilities.Template] },
  () => import('./capabilities/templates'),
);

export const RoutinePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema.workerd'))),
  Plugin.addModule(Templates),
  Plugin.make,
);

export default RoutinePlugin;
