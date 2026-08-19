//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import {
  Commands,
  CreateObject,
  IdentityCreated,
  ObservabilityMappings,
  OperationHandler,
  SkillDefinition,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { SpaceSchema } from '#types';

export const SpacePlugin = Plugin.define<SpaceSchema.SpacePluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  // Skills are the atomic unit of MCP projection, so a headless host needs the Database skill for
  // its verbs to project at all.
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(AppCapability.schema(() => import('./schema.node'))),
  Plugin.addModule(ObservabilityMappings),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(IdentityCreated),
  Plugin.make,
);

export default SpacePlugin;
