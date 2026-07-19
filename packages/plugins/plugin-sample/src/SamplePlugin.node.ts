//
// Copyright 2026 DXOS.org
//

// CLI plugin variant — a minimal plugin for headless/CLI environments.
// CLI plugins register only the capabilities needed for non-UI contexts:
// schema (so the CLI can query/create objects) and metadata (for the createObject factory).
// No surfaces, graph builders, settings, or translations are needed.

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { SampleItem } from '#types';

export const SamplePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(AppCapability.schema([SampleItem.SampleItem])),
  Plugin.addLazyModule(OperationHandler),
  Plugin.make,
);

export default SamplePlugin;
