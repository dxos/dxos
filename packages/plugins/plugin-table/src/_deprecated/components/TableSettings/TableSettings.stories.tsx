//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { create, type MutableSchema } from '@dxos/echo-schema';
import { useSpaces } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { TableSettings } from './TableSettings';
import { TableType } from '../../types';

const Story = () => {
  const [space] = useSpaces();
  const [table, setTable] = useState<TableType>();
  const [schemas, setSchemas] = useState<MutableSchema[]>([]);

  useEffect(() => {
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();

    // TODO(zan): This can be moved to `onSpaceCreated` on `clientRepeater` after client is made available
    // TODO(zan): Currently we need to cast as any since `_graph` is marked @internal.
    setTable(space.db.add(create(TableType, { name: 'Table', props: [] })));
    void space.db.schema.list().then(setSchemas).catch();
  }, []);

  if (!table) {
    return null;
  }

  return <TableSettings table={table} schemas={schemas} />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-table-deprecated/TableSettings',
  component: TableSettings,
  // TODO(burdon): Use decorator.
  render: () => <ClientRepeater component={Story} types={[TableType]} createSpace />,
  decorators: [withTheme],
};

export default meta;
