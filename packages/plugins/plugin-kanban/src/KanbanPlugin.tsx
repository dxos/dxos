//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CreateObject, OperationHandler, ReactSurface, SkillDefinition, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Kanban } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const KanbanPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(AppCapability.schema([Kanban.Kanban])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default KanbanPlugin;
