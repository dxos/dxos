//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

import * as Sheet from './Sheet.ts';

/** A chart as stored inline on a sheet before charts became their own objects. */
export const LegacyChart = Schema.Struct({
  id: Schema.String,
  ...Sheet.ChartProperties.fields,
});

export type LegacyChart = Schema.Schema.Type<typeof LegacyChart>;

/**
 * The sheet as stored before charts became their own objects: `charts` held each chart inline. Kept solely so
 * the sheet migration can read existing data; never constructed by this plugin.
 */
export class LegacySheet extends Type.makeObject<LegacySheet>(DXN.make('org.dxos.type.sheet', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    cells: Schema.Record(Schema.String, Sheet.CellValue),
    rows: Schema.Array(Schema.String),
    columns: Schema.Array(Schema.String),
    rowMeta: Schema.Record(Schema.String, Sheet.RowColumnMeta),
    columnMeta: Schema.Record(Schema.String, Sheet.RowColumnMeta),
    ranges: Schema.Array(Sheet.Range),
    charts: Schema.optional(Schema.Array(LegacyChart)),
  }),
) {}
