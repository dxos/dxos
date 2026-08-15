//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  BuiltinConnectors,
  Commands,
  Coordinator,
  CreateObject,
  OAuthRedirect,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const ConnectorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(BuiltinConnectors),
  // Previously wired only into the node entry; included here too because the command graph is
  // demand-gated on `CommandsRequested`, fired both by the `dx` CLI at boot and by browser hosts
  // when the devtools terminal opens — omitting it from browser was a gap, not a deliberate scope.
  Plugin.addModule(Commands),
  Plugin.addModule(Coordinator),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OAuthRedirect),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default ConnectorPlugin;
