//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';

import { meta } from '../meta';

import * as Sheet from './Sheet';

// TODO(wittjosiah): Factor out. This is `DxGridAxis` from `@dxos/react-ui-grid`.
const ActionAxis = Schema.Union(Schema.Literal('row'), Schema.Literal('col'));

export namespace SheetAction {
  export const RestoreAxis = Schema.Struct({
    axis: ActionAxis,
    axisIndex: Schema.String,
    index: Schema.Number,
    axisMeta: Sheet.RowColumnMeta,
    values: Schema.Array(Schema.Any),
  });

  export type RestoreAxis = Schema.Schema.Type<typeof RestoreAxis>;
}

const SHEET_OPERATION = `${meta.id}/operation`;

// TODO(wittjosiah): Factor out. This is `DxGridAxis` from `@dxos/react-ui-grid`.
const Axis = Schema.Union(Schema.Literal('row'), Schema.Literal('col'));

export namespace SheetOperation {
  export const InsertAxis = Operation.make({
    meta: { key: `${SHEET_OPERATION}/axis-insert`, name: 'Insert Axis' },
    schema: {
      input: Schema.Struct({
        model: Schema.Any,
        axis: Axis,
        index: Schema.Number,
        count: Schema.optional(Schema.Number),
      }),
      output: Schema.Void,
    },
  });

  export const DropAxisOutput = Schema.Struct({
    axis: Axis.annotations({ description: 'The axis type (row or col).' }),
    axisIndex: Schema.String.annotations({ description: 'The dropped axis index.' }),
    index: Schema.Number.annotations({ description: 'The position the axis was at.' }),
    axisMeta: Schema.Any.annotations({ description: 'The row/column metadata.' }),
    values: Schema.Array(Schema.Any).annotations({ description: 'The cell values that were dropped.' }),
  });

  export type DropAxisOutput = Schema.Schema.Type<typeof DropAxisOutput>;

  export const DropAxis = Operation.make({
    meta: { key: `${SHEET_OPERATION}/axis-drop`, name: 'Drop Axis' },
    schema: {
      input: Schema.Struct({
        model: Schema.Any,
        axis: Axis,
        axisIndex: Schema.String,
      }),
      output: DropAxisOutput,
    },
  });

  /**
   * Restore a dropped axis (inverse of DropAxis).
   */
  export const RestoreAxis = Operation.make({
    meta: { key: `${SHEET_OPERATION}/restore-axis`, name: 'Restore Axis' },
    schema: {
      input: Schema.Struct({
        model: Schema.Any.annotations({ description: 'The sheet model.' }),
        axis: Axis.annotations({ description: 'The axis type (row or col).' }),
        axisIndex: Schema.String.annotations({ description: 'The axis index to restore.' }),
        index: Schema.Number.annotations({ description: 'The position to restore at.' }),
        axisMeta: Schema.Any.annotations({ description: 'The row/column metadata.' }),
        values: Schema.Array(Schema.Any).annotations({ description: 'The cell values to restore.' }),
      }),
      output: Schema.Void,
    },
  });
}
