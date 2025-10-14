//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

// TODO(wittjosiah): Remove. Use ordering in queries instead.

/** @deprecated */
const SortDirection = Schema.Union(Schema.Literal('asc'), Schema.Literal('desc'));
/** @deprecated */
export type SortDirectionType = Schema.Schema.Type<typeof SortDirection>;

/** @deprecated */
const FieldSort = Schema.Struct({
  fieldId: Schema.String,
  direction: SortDirection,
}).pipe(Schema.mutable);

/** @deprecated */
export interface FieldSortType extends Schema.Schema.Type<typeof FieldSort> {}
/** @deprecated */
export const FieldSortType: Schema.Schema<FieldSortType> = FieldSort;
