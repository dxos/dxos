//
// Copyright 2026 DXOS.org
//

// CLI plugin variant — a minimal plugin for headless/CLI environments.
// CLI plugins register only the capabilities needed for non-UI contexts:
// schema (so the CLI can query/create objects) and metadata (for the createObject factory).
// No surfaces, graph builders, settings, or translations are needed.

import * as Plugin from '@dxos/app-framework/Plugin';

import { CreateObject, OperationHandler, Schema } from '#capabilities';
import { meta } from '#meta';

export const SamplePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(Schema),
  Plugin.addModule(OperationHandler),
  Plugin.make,
);

export default SamplePlugin;
