//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

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
