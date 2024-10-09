//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { create, getSpace } from '@dxos/react-client/echo';
import { classifySchemaProperties } from '@dxos/react-ui-table';

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

    const properties = classifySchemaProperties(table.schema).filter(([key]) =>
      table.props.find((prop) => prop.id === key),
    );

    const columnDefs = properties.map(([key, type]) => {
      return {
        id: key,
        dataType: type === 'ref' || type === 'display' ? 'string' : type,
        headerLabel: key,
        accessor: (row: any) => row[key],
      };
    });

    // Sort by the key position in table.props
    // TODO(Zan): Something fishy here. Why is 'count' first in our storybook example?
    return columnDefs.sort((a, b) => {
      const indexA = table.props.findIndex((prop) => prop === a.id);
      const indexB = table.props.findIndex((prop) => prop === b.id);
      return indexA - indexB;
    });
  }, [table.schema, table.props]);

  const space = getSpace(table);
  const objects = useTableObjects(space, table.schema);

  // TODO(Zan): Delete this after testing.
  const addRow = () => {
    if (!table.schema || !space) {
      return;
    }
    const newrow = create(table.schema, { title: 'test', description: 'content', count: 0 });
    space.db.add(newrow);
  };

  // TODO(Zan): Do we need this?
  if (!table.schema) {
    return <p>No schema</p>;
  }

  return (
    <div>
      <button className='ch-button' onClick={() => addRow()}>
        Add row
      </button>
      <Table columnDefinitions={columnDefinitions} data={objects} />
    </div>
  );
};
