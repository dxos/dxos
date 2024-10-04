//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { ClientRepeater } from '@dxos/react-client/testing';
import { Grid } from '@dxos/react-ui-grid';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { useTable } from './hooks/';
import { type ColumnDefinition } from './table';

const makeData = (n: number) => {
  const { data } = create({
    data: Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      name: `Person ${i + 1}`,
      age: Math.floor(Math.random() * 50) + 20,
      active: Math.random() > 0.5,
    })),
  });
  return data;
};

const columnDefinitions: ColumnDefinition[] = [
  { id: 'id', dataType: 'number', headerLabel: 'ID', accessor: (row: any) => row.id },
  { id: 'name', dataType: 'string', headerLabel: 'Name', accessor: (row: any) => row.name },
  { id: 'age', dataType: 'number', headerLabel: 'Age', accessor: (row: any) => row.age },
  { id: 'active', dataType: 'boolean', headerLabel: 'Active', accessor: (row: any) => row.active },
];

const Story = () => {
  const data = React.useMemo(() => makeData(10000), []);
  const { table, dispatch: _dispatch } = useTable(columnDefinitions, data);

  const handleAddRow = () => {
    const newRow = {
      id: data.length + 1,
      name: `New Person ${data.length + 1}`,
      age: Math.floor(Math.random() * 50) + 20,
      active: Math.random() > 0.5,
    };
    data.unshift(newRow);
  };

  // // Mutations
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     const randomRowIndex = Math.floor(Math.random() * data.length);
  //     const randomField = ['name', 'age', 'active'][Math.floor(Math.random() * 3)];

  //     if (randomField === 'name') {
  //       data[randomRowIndex].name = `Person ${Math.floor(Math.random() * 1000)}`;
  //     } else if (randomField === 'age') {
  //       data[randomRowIndex].age = Math.floor(Math.random() * 50) + 20;
  //     } else {
  //       data[randomRowIndex].active = !data[randomRowIndex].active;
  //     }
  //   }, 100);
  //   return () => clearInterval(interval);
  // }, [data]);

  return (
    <div>
      <button onClick={handleAddRow}>Add Row</button>
      <Grid.Root id='table-v2'>
        <Grid.Content
          initialCells={Object.fromEntries(
            table.rows.value.flatMap((row, rowIndex) =>
              table.columnDefinitions.map((col, colIndex) => [
                `${colIndex},${rowIndex}`,
                { value: row.value[col.id].toString() },
              ]),
            ),
          )}
          columnDefault={{ size: 120, resizeable: true }}
          rowDefault={{ size: 32, resizeable: true }}
          // TODO(Zan): Make this fast.
          columns={Object.fromEntries(
            table.columnDefinitions.map((col, index) => [index, { size: table.columnWidths[col.id] }]),
          )}
          onAxisResize={(event) => {
            if (event.axis === 'col') {
              // dispatch({
              //   type: 'ModifyColumnWidth',
              //   columnId: table.columnDefinitions[event.index].id,
              //   width: event.size,
              // });
            }
          }}
        />
      </Grid.Root>
    </div>
  );
};

export default {
  title: 'plugin-table/table-next',
  component: Story,
  render: () => <ClientRepeater component={Story} createIdentity createSpace />,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { layout: 'fullscreen' },
};

export const Default = {};
