//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { Table as TableType } from '@braneframe/types';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { Schema, useSpaces } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { Button } from '@dxos/react-ui';

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
    console.log(JSON.stringify(table, undefined, 2), success);
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
  component: TableSettings,
  render: Story,
  decorators: [ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    // table: new TableType(), // TODO(burdon): Causes hang.
  },
};
