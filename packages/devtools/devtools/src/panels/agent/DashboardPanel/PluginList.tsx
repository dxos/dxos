//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginState } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { Button } from '@dxos/react-ui';
import { createColumnBuilder, Table, type TableColumnDef } from '@dxos/react-ui-table';

export type PluginListProps = {
  plugins: PluginState[];
  togglePlugin: (pluginId: string) => void;
};

export const PluginList = ({ plugins, togglePlugin }: PluginListProps) => {
  const { helper, builder } = createColumnBuilder<PluginState>();
  const columns: TableColumnDef<PluginState, any>[] = [
    helper.accessor('id', builder.string()),
    helper.accessor((plugin) => !!plugin.config.enabled, { id: 'enabled', ...builder.icon(), size: 80 }),
    helper.display({
      id: 'toggle',
      cell: (context) => (
        <Button
          disabled={context.row.original.id === 'dxos.org/agent/plugin/dashboard'}
          onClick={() => {
            void togglePlugin(context.row.original.id);
          }}
        >
          {context.row.original.config.enabled ? 'Disable' : 'Enable'}
        </Button>
      ),
    }),
  ];
  return <Table<PluginState> columns={columns} data={plugins} fullWidth />;
};
