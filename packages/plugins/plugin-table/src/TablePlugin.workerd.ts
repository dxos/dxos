//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Table } from '@dxos/react-ui-table/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const TablePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Table.Table])),
  Plugin.make,
);

export default TablePlugin;
