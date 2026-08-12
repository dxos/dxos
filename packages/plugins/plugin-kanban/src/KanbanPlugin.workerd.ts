//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Kanban } from '#types';

export const KanbanPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Kanban.Kanban])),
  Plugin.make,
);

export default KanbanPlugin;
