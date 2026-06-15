//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { pipe } from 'effect/Function';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import * as Collection from './Collection';
import * as Feed from './Feed';
import * as Obj from './Obj';
import * as Type from './Type';
import * as View from './View';

/**
 * Abstract set of objects, represented by a view, feed, or collection.
 * Schema-level union of the underlying type entities (rebuilt via
 * `Type.getSchema`) so this can still be consumed by Schema-side APIs such
 * as `Filter.type(...)` on a union.
 */
export type Dataset = Feed.Feed | Collection.Collection | View.View;
export const Dataset = Schema.Union(
  Type.getSchema(Feed.Feed),
  Type.getSchema(Collection.Collection),
  Type.getSchema(View.View),
);

export const isDataset: (value: unknown) => value is Dataset = pipe(
  Obj.instanceOf(Feed.Feed),
  Predicate.or(Obj.instanceOf(Collection.Collection)),
  Predicate.or(Obj.instanceOf(View.View)),
);
