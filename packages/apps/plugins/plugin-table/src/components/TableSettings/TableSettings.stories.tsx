//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Table as TableType } from '@braneframe/types/proto';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { Schema, useSpaces } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { Button } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { TableSettings } from './TableSettings';

const Story = () => {
  const [space] = useSpaces();
  const [open, setOpen] = useState(true);
  const [table, setTable] = useState<TableType>();
  const { objects: schemas } = space.db.query(Schema.filter());
  useEffect(() => {
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();

    setTable(space.db.add(new TableType()));
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
