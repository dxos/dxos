//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';

import { meta } from '../meta';
import { SheetModel } from '../model';

import * as Sheet from './Sheet';

export namespace SheetAction {
  const SHEET_ACTION = `${meta.id}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${SHEET_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Sheet.Sheet,
    }),
  }) {}

  // TODO(wittjosiah): Factor out. This is `DxGridAxis` from `@dxos/react-ui-grid`.
  const Axis = Schema.Union(Schema.Literal('row'), Schema.Literal('col'));

  export class InsertAxis extends Schema.TaggedClass<InsertAxis>()(`${SHEET_ACTION}/axis-insert`, {
    input: Schema.Struct({
      // TODO(wittjosiah): Schema.instanceOf(SheetModel) throws when running tests.
      model: Schema.Any.pipe(Schema.filter((model) => model instanceof SheetModel)) as Schema.Schema<SheetModel>,
      axis: Axis,
      index: Schema.Number,
      count: Schema.optional(Schema.Number),
    }),
    output: Schema.Void,
  }) {}

  export const RestoreAxis = Schema.Struct({
    axis: Axis,
    axisIndex: Schema.String,
    index: Schema.Number,
    axisMeta: Sheet.RowColumnMeta,
    values: Schema.Array(Schema.Any),
  });

  export type RestoreAxis = Schema.Schema.Type<typeof RestoreAxis>;

  export class DropAxis extends Schema.TaggedClass<DropAxis>()(`${SHEET_ACTION}/axis-drop`, {
    input: Schema.Struct({
      // TODO(wittjosiah): Schema.instanceOf(SheetModel) throws when running tests.
      model: Schema.Any.pipe(Schema.filter((model) => model instanceof SheetModel)) as Schema.Schema<SheetModel>,
      axis: Axis,
      axisIndex: Schema.String,
      deletionData: Schema.optional(RestoreAxis),
    }),
    output: Schema.Void,
  }) {}
}

const SHEET_OPERATION = `${meta.id}/operation`;

// TODO(wittjosiah): Factor out. This is `DxGridAxis` from `@dxos/react-ui-grid`.
const Axis = Schema.Union(Schema.Literal('row'), Schema.Literal('col'));

export namespace SheetOperation {
  export const Create = Operation.make({
    meta: { key: `${SHEET_OPERATION}/create`, name: 'Create Sheet' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Sheet.Sheet,
      }),
    },
  });

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
