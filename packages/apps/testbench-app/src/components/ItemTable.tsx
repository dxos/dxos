//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { type S } from '@dxos/echo-schema';
import { type ReactiveObject } from '@dxos/live-object';
import { Table, schemaToColumnDefs } from '@dxos/react-ui-table/deprecated';

export type ItemTableProps<T> = {
  schema: S.Schema<T>;
  objects?: T[];
};

export const ItemTable = <T extends ReactiveObject<any>>({ schema, objects = [] }: ItemTableProps<T>) => {
  const columns = useMemo(() => {
    // TODO(burdon): [API]: id is added to schema?
    const [id, ...rest] = schemaToColumnDefs(schema);
    return [
      {
        ...id,
        // TODO(burdon): Sizes are not respected.
        size: 60,
        minSize: 60,
        maxSize: 60,
        cell: (cell) => <span className='px-2 font-mono'>{cell.getValue()?.slice(0, 8)}</span>,
      },
      ...rest,
    ];
  }, [schema]);

  return (
    <Table.Root>
      <Table.Viewport>
        <Table.Main<T>
          role='grid'
          rowsSelectable='multi'
          keyAccessor={(row) => row.id}
          columns={columns}
          data={objects}
          fullWidth
          stickyHeader
          border
        />
      </Table.Viewport>
    </Table.Root>
  );
};
