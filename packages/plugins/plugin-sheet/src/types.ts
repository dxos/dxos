//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { Ref, S, TypedObject } from '@dxos/echo-schema';
import { type MarkdownExtensionProvides } from '@dxos/plugin-markdown';
import { type SchemaProvides } from '@dxos/plugin-space';
import { ThreadType } from '@dxos/plugin-space/types';

import { SHEET_PLUGIN } from './meta';
import { SheetModel } from './model';

// TODO(Zan): Move this to the plugin-space plugin or another common location
// when we implement comments in sheets.
// This is currently duplicated in a few places.
type ThreadProvides<T> = {
  thread: {
    predicate: (obj: any) => obj is T;
    createSort: (obj: T) => (anchorA: string | undefined, anchorB: string | undefined) => number;
  };
};

export type SheetPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MarkdownExtensionProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides &
  ThreadProvides<SheetType>;

export type CellScalarValue = number | string | boolean | null;

export const CellValue = S.Struct({
  // TODO(burdon): How to store dates (datetime, date, time), percentages, etc.
  //  Consider import/export; natural access for other plugins. Special handling for currency (precision).
  // TODO(burdon): Automerge (long string) or short string or number.
  value: S.Any,
});

export type CellValue = S.Schema.Type<typeof CellValue>;

// TODO(burdon): IMPORTANT: Reconcile with Field definition.
export const Range = S.Struct({
  range: S.String,
  key: S.String,
  value: S.String,
});

export type Range = S.Schema.Type<typeof Range>;

// TODO(burdon): Visibility, locked, frozen, etc.
export const RowColumnMeta = S.Struct({
  size: S.optional(S.Number),
});

// TODO(burdon): Index to all updates when rows/columns are inserted/deleted.
export class SheetType extends TypedObject({ typename: 'dxos.org/type/Sheet', version: '0.1.0' })({
  name: S.optional(S.String),

  // Sparse map of cells referenced by index.
  cells: S.mutable(S.Record({ key: S.String, value: S.mutable(CellValue) })),

  // Ordered row indices.
  rows: S.mutable(S.Array(S.String)),

  // Ordered column indices.
  columns: S.mutable(S.Array(S.String)),

  // Row metadata referenced by index.
  rowMeta: S.mutable(S.Record({ key: S.String, value: S.mutable(RowColumnMeta) })),

  // Column metadata referenced by index.
  columnMeta: S.mutable(S.Record({ key: S.String, value: S.mutable(RowColumnMeta) })),

  // Cell formatting referenced by indexed range.
  ranges: S.mutable(S.Array(Range)),

  // Threads associated with the sheet
  threads: S.optional(S.mutable(S.Array(Ref(ThreadType)))),
}) {}

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

  export class Create extends S.TaggedClass<Create>()(`${SHEET_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: SheetType,
    }),
  }) {}

  // TODO(wittjosiah): Factor out. This is `DxGridAxis` from `@dxos/react-ui-grid`.
  const Axis = S.Union(S.Literal('row'), S.Literal('col'));

  export class InsertAxis extends S.TaggedClass<InsertAxis>()(`${SHEET_ACTION}/axis-insert`, {
    input: S.Struct({
      // TODO(wittjosiah): S.instanceOf(SheetModel) throws when running tests.
      model: S.Any.pipe(S.filter((model) => model instanceof SheetModel)) as S.Schema<SheetModel>,
      axis: Axis,
      index: S.Number,
      count: S.optional(S.Number),
    }),
    output: S.Void,
  }) {}

  export const RestoreAxis = S.Struct({
    axis: Axis,
    axisIndex: S.String,
    index: S.Number,
    axisMeta: RowColumnMeta,
    values: S.Array(S.Any),
  });

  export type RestoreAxis = S.Schema.Type<typeof RestoreAxis>;

  export class DropAxis extends S.TaggedClass<DropAxis>()(`${SHEET_ACTION}/axis-drop`, {
    input: S.Struct({
      // TODO(wittjosiah): S.instanceOf(SheetModel) throws when running tests.
      model: S.Any.pipe(S.filter((model) => model instanceof SheetModel)) as S.Schema<SheetModel>,
      axis: Axis,
      axisIndex: S.String,
      deletionData: S.optional(RestoreAxis),
    }),
    output: S.Void,
  }) {}
}
