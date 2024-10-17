//
// Copyright 2023 DXOS.org
//

import { type FieldValueType } from '@dxos/schema';

/**
 * @deprecated
 */
// TODO(burdon): Reconcile with @dxos/schema/View.
export type TableDef = {
  id: string;
  name?: string;
  columns: ColumnDef[];
};

/**
 * @deprecated
 */
// TODO(burdon): Reconcile with @dxos/schema/Field.
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
