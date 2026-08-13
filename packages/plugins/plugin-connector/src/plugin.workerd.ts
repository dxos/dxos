//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, Schema } from '#capabilities';
import { meta } from '#meta';

// Headless variant registered by workers (e.g. the edge operation-service). The capabilities come
// from `#capabilities`, which resolves a server-safe barrel under the `workerd` condition — the
// browser barrel declares React surfaces, and a bundler follows the dynamic import behind a lazy
// capability, so resolving it here would drag React into a bundle that cannot load it.
export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),

  Plugin.make,
);

export default ConnectorPlugin;
