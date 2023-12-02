//
// Copyright 2023 DXOS.org
//

export type TableDef = {
  id: string;
  name?: string; // TODO(burdon): Required?
  columns: ColumnProps[];
};

export type ColumnType = 'number' | 'boolean' | 'date' | 'string' | 'ref';

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
