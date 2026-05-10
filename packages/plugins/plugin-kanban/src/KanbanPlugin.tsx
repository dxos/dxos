//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client/types';

import {
  BlueprintDefinition,
  CreateObject,
  Migrations,
  OperationHandler,
  UndoMappings,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Kanban } from '#types';

export const KanbanPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({ schema: [Kanban.Kanban] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ClientEvents.SetupMigration,
    activate: Migrations,
  }),
  Plugin.make,
);

export default KanbanPlugin;
