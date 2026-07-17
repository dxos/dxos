//
// Copyright 2026 DXOS.org
//

// CLI plugin variant — a minimal plugin for headless/CLI environments.
// CLI plugins register only the capabilities needed for non-UI contexts:
// schema (so the CLI can query/create objects) and metadata (for the createObject factory).
// No surfaces, graph builders, settings, or translations are needed.

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { SampleItem } from '#types';

export const SamplePlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addSchemaModule({ schema: [SampleItem.SampleItem] }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  Plugin.make,
);

export default SamplePlugin;
