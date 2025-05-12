//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { type CellValue, RowColumnMeta, SheetType } from './schema';
import { SHEET_PLUGIN } from '../meta';
import { SheetModel } from '../model';

export type SheetSize = {
  rows: number;
  columns: number;
};

export type CreateSheetOptions = {
  name?: string;
  cells?: Record<string, CellValue>;
} & Partial<SheetSize>;

export namespace SheetAction {
  const SHEET_ACTION = `${SHEET_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${SHEET_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: SheetType,
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
    axisMeta: RowColumnMeta,
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
