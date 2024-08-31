//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { create, type DynamicSchema } from '@dxos/echo-schema';
import { useSpaces } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { TableSettings } from './TableSettings';
import { TableType } from '../../types';

const Story = () => {
  const [space] = useSpaces();
  const [table, setTable] = useState<TableType>();
  const [schemas, setSchemas] = useState<DynamicSchema[]>([]);

  useEffect(() => {
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();

    // TODO(zan): This can be moved to `onCreateSpace` on `clientRepeater` after client is made available
    // TODO(zan): Currently we need to cast as any since `_graph` is marked @internal.
    setTable(space.db.add(create(TableType, { name: 'Table', props: [] })));
    void space.db.schema.list().then(setSchemas).catch();
  }, []);

  if (!table) {
    return null;
  }

  return <TableSettings table={table} schemas={schemas} />;
};

export default {
  title: 'plugin-table/TableSettings',
  component: TableSettings,
  render: () => <ClientRepeater types={[TableType]} component={Story} createSpace />,
  decorators: [withTheme],
};

export const Default = {
  args: {
    // table: new TableType(), // TODO(burdon): Causes hang.
  },
};
