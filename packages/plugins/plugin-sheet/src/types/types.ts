//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

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
