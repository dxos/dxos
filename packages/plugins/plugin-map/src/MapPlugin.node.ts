//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { AppGraphBuilder, CreateObject, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { Map } from '#types';

export const MapPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Map.Map])),
  Plugin.make,
);

export default MapPlugin;
