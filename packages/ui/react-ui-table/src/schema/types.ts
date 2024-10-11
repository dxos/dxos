//
// Copyright 2023 DXOS.org
//

export type TableDef = {
  id: string;
  name?: string;
  columns: ColumnProps[];
};

// TODO(burdon): Use Effect defs?
export type ColumnType = 'number' | 'boolean' | 'date' | 'string' | 'json' | 'ref';

// TODO(burdon): Effect schema?
export type ColumnProps = {
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
