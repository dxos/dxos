//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type S } from '@dxos/echo-schema';
import { type ReactiveObject } from '@dxos/live-object';
import { Table, useTableModel } from '@dxos/react-ui-table';

export type ItemTableProps<T> = {
  schema: S.Schema<T>;
  objects?: T[];
};

// TODO(burdon): Convert to new Table.
export const ItemTable = <T extends ReactiveObject<any>>({ schema, objects = [] }: ItemTableProps<T>) => {
  const model = useTableModel({
    objects,
  });

  // const columns = useMemo(() => {
  //   // TODO(burdon): [API]: id is added to schema?
  //   const [id, ...rest] = schemaToColumnDefs(schema);
  //   return [
  //     {
  //       ...id,
  //       // TODO(burdon): Sizes are not respected.
  //       size: 60,
  //       minSize: 60,
  //       maxSize: 60,
  //       cell: (cell) => <span className='px-2 font-mono'>{cell.getValue()?.slice(0, 8)}</span>,
  //     },
  //     ...rest,
  //   ];
  // }, [schema]);

  return (
    <Table.Root>
      <Table.Main model={model} />
    </Table.Root>
  );
};
