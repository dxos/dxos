//
// Copyright 2024 DXOS.org
//

import { type TableType, type TableTypeProp } from '@braneframe/types';
import { type Space } from '@dxos/react-client/echo';
import { type ColumnProps, type TableDef } from '@dxos/react-ui-table';

import { schemaPropMapper, createColumnsFromTableDef } from '../../schema';

/**
 * Mutably updates a given table property in the props array.
 * If the property with the oldId exists, it is updated with the new values.
 * If it doesn't exist, the new property is added to the end of the props array.
 */
export const updateTableProp = (props: TableTypeProp[], oldId: string, update: TableTypeProp) => {
  const idx = props.findIndex((prop) => prop.id === oldId);

  if (idx !== -1) {
    const current = props![idx];
    props.splice(idx, 1, { ...current, ...update });
  } else {
    props.push(update);
  }
};

export const createColumns = (
  space: Space | undefined,
  tables: TableType[],
  table: TableType,
  onColumnUpdate: (oldId: string, column: ColumnProps) => void,
  onColumnDelete: (id: string) => void,
  onRowUpdate: (object: any, prop: string, value: any) => void,
  onRowDelete: (object: any) => void,
) => {
  const tableDefs: TableDef[] = tables
    .filter((table) => table.schema)
    .map((table) => ({
      id: table.schema!.id,
      name: table.title ?? table.schema?.typename,
      columns: table.schema!.getProperties().map(schemaPropMapper(table)),
    }));

  const tableDef = tableDefs.find((tableDef) => tableDef.id === table.schema?.id);

  if (!tableDef || !space) {
    return [];
  }

  return createColumnsFromTableDef({
    tableDef,
    tablesToReference: tableDefs,
    space,
    onColumnUpdate,
    onColumnDelete,
    onRowUpdate,
    onRowDelete,
  });
};
