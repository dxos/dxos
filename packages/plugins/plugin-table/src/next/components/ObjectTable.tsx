//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { create, getSpace } from '@dxos/react-client/echo';

import { Table } from './Table';
import { type TableType } from '../../types';
import { useTableObjects } from '../hooks';
import { type ColumnDefinition } from '../table';

export type ObjectTableProps = {
  table: TableType;
};

export const ObjectTable: React.FC<ObjectTableProps> = ({ table }) => {
  const columnDefinitions: ColumnDefinition[] = useMemo(() => {
    if (!table.schema) {
      return [];
    }

    // TODO(zan): I wonder if it's time to interrogate the schema more deeply with tools
    // from ../schema
    return Object.entries(table.schema.getProperties()).map(([key, property]) => ({
      id: key,
      dataType: property.type as any, // This might need refinement based on your schema types
      headerLabel: table.props.find((prop) => prop.id === key)?.label ?? key,
      accessor: (row: any) => row[key],
    }));
  }, [table.schema, table.props]);

  const space = getSpace(table);
  const objects = useTableObjects(space, table.schema);

  const addRow = () => {
    if (!table.schema || !space) {
      return;
    }
    const newRow = create(table.schema, {});
    space.db.add(newRow);
  };

  // TODO(Zan): Do we need this?
  if (!table.schema) {
    return <p>No schema</p>;
  }

  return (
    <div>
      <button onClick={() => addRow()}>Add row</button>
      <Table columnDefinitions={columnDefinitions} data={objects} />
    </div>
  );
};
