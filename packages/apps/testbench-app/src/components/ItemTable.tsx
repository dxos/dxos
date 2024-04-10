//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';
import React, { useMemo, useRef } from 'react';

import { Table, schemaToColumnDefs } from '@dxos/react-ui-table';

export type ItemTableProps<T> = {
  schema: S.Schema<T>;
  items: T[];
};

export const ItemTable = <T,>({ schema, items }: ItemTableProps<T>) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const columns = useMemo(() => {
    return schemaToColumnDefs(schema);
  }, [schema]);

  return (
    <div ref={containerRef} className='fixed inset-0 overflow-auto'>
      <Table<T>
        role='grid'
        rowsSelectable='multi'
        keyAccessor={(row) => JSON.stringify(row)}
        columns={columns}
        data={items}
        fullWidth
        stickyHeader
        border
        getScrollElement={() => containerRef.current}
      />
    </div>
  );
};
