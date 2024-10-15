//
// Copyright 2023 DXOS.org
//

import { type FieldValueType } from '@dxos/react-ui-data';

// TODO(burdon): Reconcile with react-ui-data/View.
export type TableDef = {
  id: string;
  name?: string;
  columns: ColumnDef[];
};

// TODO(burdon): Reconcile with react-ui-data/Field.
export type ColumnDef = {
  id: string;
  prop: string;
  type: FieldValueType;
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
