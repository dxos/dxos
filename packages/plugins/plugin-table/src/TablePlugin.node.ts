//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Table } from '@dxos/react-ui-table/types';

import { SkillDefinition, CommentConfig, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const TablePlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addCommentConfigModule({ activate: CommentConfig }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Table.Table] }),
  Plugin.make,
);

export default TablePlugin;
