//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import type { S, OpaqueEchoObject } from '@dxos/echo-schema';
import { Table, schemaToColumnDefs } from '@dxos/react-ui-table';

export type ItemTableProps<T> = {
  schema: S.Schema<T>;
  objects?: T[];
};

export const ItemTable = <T extends OpaqueEchoObject>({ schema, objects = [] }: ItemTableProps<T>) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
        cell: (cell) => <span className='px-2 font-mono'>{cell.getValue().slice(0, 8)}</span>,
      },
      ...rest,
    ];
  }, [schema]);

  return (
    <div ref={containerRef} className='overflow-auto'>
      <Table<T>
        role='grid'
        rowsSelectable='multi'
        keyAccessor={(row) => row.id}
        columns={columns}
        data={objects}
        fullWidth
        stickyHeader
        border
        getScrollElement={() => containerRef.current}
      />
    </div>
  );
};
