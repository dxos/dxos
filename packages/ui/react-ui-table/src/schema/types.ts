//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Effect schema

export type TableDef = {
  id: string;
  name?: string;
  columns: ColumnDef[];
};

export type ColumnType = 'number' | 'boolean' | 'date' | 'string' | 'json' | 'ref';

export type ColumnDef = {
  id: string;
  prop: string;
  type: ColumnType;
  size?: number;
  label?: string;

  // type = number
  digits?: number;

  // type = ref
  refTable?: string;
  refProp?: string;

  // TODO(burdon): Move to meta.
  fixed?: boolean;
  editable?: boolean;
  resizable?: boolean;
};
