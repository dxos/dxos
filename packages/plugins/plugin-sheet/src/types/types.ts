//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type MarkdownExtensionProvides } from '@dxos/plugin-markdown';
import { type SchemaProvides } from '@dxos/plugin-space';

import { type CellValue, RowColumnMeta, SheetType } from './schema';
import { SHEET_PLUGIN } from '../meta';
import { SheetModel } from '../model';

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
