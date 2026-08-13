//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

// TODO(burdon): Proper fix is a `workerd` condition on `#capabilities` (a `capabilities/workerd.ts`
// barrel, as plugin-assistant and plugin-magazine already have) rather than reaching past the
// barrel into individual capability modules from here. That keeps the barrel the single place
// capabilities are declared; this file should go back to importing from `#capabilities`.
// Headless variant registered by workers (e.g. the edge operation-service). Every capability is
// imported directly rather than through `#capabilities`: that barrel declares `ReactSurface`, and a
// bundler follows the dynamic import behind a lazy capability, so touching it drags the React
// surface into a worker bundle that cannot load it. `#capabilities` resolves `node` and `default`
// only, and wrangler resolves with `workerd, worker, browser` — so the node-side barrel never
// applies here and `default` (the browser one) would win.
export const MarkdownPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.skillDefinition(() => import('./capabilities/skill-definition'))),
  Plugin.addModule(AppCapability.operationHandler(() => import('./capabilities/operation-handler'))),
  Plugin.addModule(AppCapability.schema(() => import('./capabilities/schema'))),
  Plugin.make,
);

export default MarkdownPlugin;
