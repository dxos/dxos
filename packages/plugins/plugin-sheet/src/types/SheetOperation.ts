//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import * as Sheet from './Sheet.ts';

// TODO(wittjosiah): Factor out. This is `DxGridAxis` from `@dxos/react-ui-grid`.
const Axis = Schema.Union([Schema.Literal('row'), Schema.Literal('col')]);

export const InsertAxis = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.sheet.insertAxis'), name: 'Insert Axis', icon: 'ph--plus--regular' },
  input: Schema.Struct({
    model: Schema.Any,
    axis: Axis,
    index: Schema.Number,
    count: Schema.optional(Schema.Number),
  }),
  output: Schema.Void,
});

export const DropAxisOutput = Schema.Struct({
  axis: Axis.annotate({ description: 'The axis type (row or col).' }),
  axisIndex: Schema.String.annotate({ description: 'The dropped axis index.' }),
  index: Schema.Number.annotate({ description: 'The position the axis was at.' }),
  axisMeta: Schema.Any.annotate({ description: 'The row/column metadata.' }),
  values: Schema.Array(Schema.Any).annotate({ description: 'The cell values that were dropped.' }),
});

export type DropAxisOutput = Schema.Schema.Type<typeof DropAxisOutput>;

export const DropAxis = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sheet.dropAxis'),
    name: 'Drop Axis',
    icon: 'ph--trash--regular',
  },
  input: Schema.Struct({
    model: Schema.Any,
    axis: Axis,
    axisIndex: Schema.String,
  }),
  output: DropAxisOutput,
});

export const ScrollToAnchor = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sheet.scrollToAnchor'),
    name: 'Scroll To Anchor',
    icon: 'ph--anchor-simple--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.String.annotate({ description: 'Attendable ID of the sheet.' }),
    cursor: Schema.String.annotate({ description: 'Cell range coordinates.' }),
    id: Schema.optional(Schema.Any.annotate({ description: 'Active refs for highlighting.' })),
  }),
  output: Schema.Void,
});

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sheet.create'),
    name: 'Create',
    description: 'Creates a new sheet and adds it to the space.',
    icon: 'ph--grid-nine--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotate({ description: 'Display name for the sheet.' }),
    rows: Schema.optional(Schema.Number).annotate({ description: 'Initial number of rows (default 50).' }),
    columns: Schema.optional(Schema.Number).annotate({ description: 'Initial number of columns (default 26).' }),
  }),
  output: Schema.Struct({
    id: Schema.String.annotate({ description: 'The DXN of the created sheet.' }),
  }),
  services: [Database.Service],
});

export const GetValues = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sheet.getRange'),
    name: 'Get Range Values',
    description: 'Returns cell values from a sheet as a 2D array. Defaults to the entire occupied area.',
    icon: 'ph--table--regular',
  },
  input: Schema.Struct({
    sheet: Ref.Ref(Sheet.Sheet).annotate({ description: 'The sheet to read from.' }),
    range: Schema.optional(Schema.String).annotate({
      description: 'Range in A1 notation (e.g. "A1:C5"). Omit to return the entire occupied area.',
    }),
  }),
  output: Schema.Struct({
    values: Schema.Array(Schema.Array(Schema.Any)).annotate({
      description:
        '2D array of cell values indexed [row][col]. Empty cells are null. Formulas are shown in A1 notation.',
    }),
    range: Schema.String.annotate({ description: 'The A1 range actually returned (e.g. "A1:E5").' }),
  }),
  services: [Database.Service],
});

export const SetValues = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sheet.setRange'),
    name: 'Set Range Values',
    description: 'Sets multiple cell values in a sheet at once.',
    icon: 'ph--pencil--regular',
  },
  input: Schema.Struct({
    sheet: Ref.Ref(Sheet.Sheet).annotate({ description: 'The sheet to write to.' }),
    cells: Schema.Record(Schema.String, Schema.Any).annotate({
      description: 'Map of A1 address to value (e.g. { "A1": "Name", "B1": 42, "C1": "=A1+B1" }).',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});

/**
 * Restore a dropped axis (inverse of DropAxis).
 */
export const RestoreAxis = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sheet.restoreAxis'),
    name: 'Restore Axis',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: Schema.Struct({
    model: Schema.Any.annotate({ description: 'The sheet model.' }),
    axis: Axis.annotate({ description: 'The axis type (row or col).' }),
    axisIndex: Schema.String.annotate({ description: 'The axis index to restore.' }),
    index: Schema.Number.annotate({ description: 'The position to restore at.' }),
    axisMeta: Schema.Any.annotate({ description: 'The row/column metadata.' }),
    values: Schema.Array(Schema.Any).annotate({ description: 'The cell values to restore.' }),
  }),
  output: Schema.Void,
});
