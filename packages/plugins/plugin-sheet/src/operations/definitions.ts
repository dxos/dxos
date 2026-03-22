//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';

const SHEET_OPERATION = `${meta.id}.operation`;

// TODO(wittjosiah): Factor out. This is `DxGridAxis` from `@dxos/react-ui-grid`.
const Axis = Schema.Union(Schema.Literal('row'), Schema.Literal('col'));

export const InsertAxis = Operation.make({
  meta: { key: `${SHEET_OPERATION}.axis-insert`, name: 'Insert Axis' },
  input: Schema.Struct({
    model: Schema.Any,
    axis: Axis,
    index: Schema.Number,
    count: Schema.optional(Schema.Number),
  }),
  output: Schema.Void,
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
  meta: { key: `${SHEET_OPERATION}.axis-drop`, name: 'Drop Axis' },
  input: Schema.Struct({
    model: Schema.Any,
    axis: Axis,
    axisIndex: Schema.String,
  }),
  output: DropAxisOutput,
});

export const ScrollToAnchor = Operation.make({
  meta: { key: `${SHEET_OPERATION}.scroll-to-anchor`, name: 'Scroll To Anchor' },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.String.annotations({ description: 'Attendable ID of the sheet.' }),
    cursor: Schema.String.annotations({ description: 'Cell range coordinates.' }),
    ref: Schema.optional(Schema.Any.annotations({ description: 'Active refs for highlighting.' })),
  }),
  output: Schema.Void,
});

/**
 * Restore a dropped axis (inverse of DropAxis).
 */
export const RestoreAxis = Operation.make({
  meta: { key: `${SHEET_OPERATION}.restore-axis`, name: 'Restore Axis' },
  input: Schema.Struct({
    model: Schema.Any.annotations({ description: 'The sheet model.' }),
    axis: Axis.annotations({ description: 'The axis type (row or col).' }),
    axisIndex: Schema.String.annotations({ description: 'The axis index to restore.' }),
    index: Schema.Number.annotations({ description: 'The position to restore at.' }),
    axisMeta: Schema.Any.annotations({ description: 'The row/column metadata.' }),
    values: Schema.Array(Schema.Any).annotations({ description: 'The cell values to restore.' }),
  }),
  output: Schema.Void,
});
