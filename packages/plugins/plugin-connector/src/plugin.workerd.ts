//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

// Headless variant registered by workers (e.g. the edge operation-service): operations and schema
// only. The capability modules are imported directly rather than through `#capabilities` — that
// barrel declares `ReactSurface` and re-exports the connector coordinator, and a bundler follows
// the dynamic import behind a lazy capability, so touching the barrel drags the React surface (and
// `.pcss` assets a worker bundle cannot load) into the graph.
const OperationHandler = AppCapability.operationHandler(() => import('./capabilities/operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
const Schema = AppCapability.schema(() => import('./capabilities/schema'));

export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
  Plugin.make,
);

export default ConnectorPlugin;
