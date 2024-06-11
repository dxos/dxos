//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { TableType } from '@braneframe/types';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { create, type DynamicSchema } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { type Hypergraph, useSpaces } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { Button } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { TableSettings } from './TableSettings';

const Story = () => {
  const [space] = useSpaces();
  const client = useClient();
  const [open, setOpen] = useState(true);
  const [table, setTable] = useState<TableType>();
  const [schemas, setSchemas] = useState<DynamicSchema[]>([]);

  useEffect(() => {
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();

    const graph = (client as any)._graph as Hypergraph;
    // TODO(zan): This can be moved to `onCreateSpace` on `clientRepeater` after client is made available
    // TODO(zan): Currently we need to cast as any since `_graph` is marked @internal.
    if (!graph.schemaRegistry.hasSchema(TableType)) {
      graph.schemaRegistry.addSchema(TableType);
    }

    setTable(space.db.add(create(TableType, { title: 'Table', props: [] })));
    void space.db.schema.list().then(setSchemas).catch();
  }, []);

  const handleClose = (success: boolean) => {
    setOpen(false);
  };

  if (!table) {
    return null;
  }

  return (
    <div className='m-4'>
      <TableSettings open={open} onClose={handleClose} table={table} schemas={schemas} />
      <Button variant='outline' onClick={() => setOpen(true)}>
        Open
      </Button>
    </div>
  );
};

export default {
  title: 'plugin-table/TableSettings',
  component: TableSettings,
  render: () => <ClientRepeater component={Story} createSpace />,
  decorators: [withTheme],
};

export const Default = {
  args: {
    // table: new TableType(), // TODO(burdon): Causes hang.
  },
};
