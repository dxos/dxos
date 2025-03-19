//
// Copyright 2025 DXOS.org
//

import React, { useRef, useMemo } from 'react';

import { mx } from '@dxos/react-ui-theme';
import { type SchemaPropertyDefinition } from '@dxos/schema';

import { Table, type TableController } from './Table';
import { useTableModel } from '../../hooks';
import { TablePresentation } from '../../model';
import { makeDynamicTable } from '../../util';

type DynamicTableProps = {
  data: any[];
  properties: SchemaPropertyDefinition[];
  tableName?: string;
  classNames?: string;
};

// TODO(ZaymonFC): Consider allowing the user to supply a schema directly instead of deriving it from
//  the properties array. (Both should be viable).

export const DynamicTable = ({
  data,
  properties,
  classNames,
  tableName = 'com.example/dynamic_table',
}: DynamicTableProps) => {
  const { table, viewProjection } = useMemo(() => {
    return makeDynamicTable(tableName, properties);
  }, [tableName, properties]);

  const model = useTableModel({
    table,
    objects: data,
    projection: viewProjection,
  });

  const presentation = useMemo(() => {
    if (model) {
      return new TablePresentation(model);
    }
  }, [model]);

  const tableRef = useRef<TableController>(null);

  return (
    <div className={mx('is-full bs-full grow grid', classNames)}>
      <div className='grid min-bs-0 overflow-hidden'>
        <Table.Root>
          <Table.Main ref={tableRef} model={model} presentation={presentation} ignoreAttention />
        </Table.Root>
      </div>
    </div>
  );
};
