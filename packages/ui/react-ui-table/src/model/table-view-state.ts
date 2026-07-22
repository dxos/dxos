//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { QueryAST } from '@dxos/echo';
import { ViewState } from '@dxos/react-ui-attention';

/**
 * Field sort configuration.
 */
export const FieldSortSchema = Schema.Struct({
  fieldId: Schema.String,
  direction: QueryAST.OrderDirection,
});

export type FieldSortType = Schema.Schema.Type<typeof FieldSortSchema>;

/**
 * Per-user column sort, scoped to a table by its object URI. Stored in the `local` backend so a
 * viewer's chosen sort survives remounts and reloads without writing to the shared view query
 * (which `TableModel.saveView` does explicitly).
 */
export const tableSortAspect = ViewState.defineViewState<FieldSortType | undefined>({
  key: 'table-sort',
  backend: 'local',
  schema: Schema.UndefinedOr(FieldSortSchema),
  defaultValue: () => undefined,
});
