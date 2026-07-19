//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Table } from '@dxos/react-ui-table/types';

import { CommentConfig, CreateObject, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const TablePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(CommentConfig),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Table.Table])),
  Plugin.make,
);

export default TablePlugin;
