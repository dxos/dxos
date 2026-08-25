//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  Commands,
  DevPluginLoader,
  OperationHandler,
  ReactSurface,
  RegistrySettings,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const RegistryPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  // Previously wired only into the node entry; included here too because the command graph is
  // demand-gated on `CommandsRequested`, fired both by the `dx` CLI at boot and by browser hosts
  // when the devtools terminal opens — omitting it from browser was a gap, not a deliberate scope.
  Plugin.addModule(Commands),
  Plugin.addModule(DevPluginLoader),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RegistrySettings),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default RegistryPlugin;
