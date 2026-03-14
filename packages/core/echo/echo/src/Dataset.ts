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
import * as View from './View';

/**
 * Abstart set of objects, represented by a view, feed, or collection.
 */
export const Dataset = Schema.Union(Feed.Feed, Collection.Collection, View.View);
export type Dataset = Feed.Feed | Collection.Collection | View.View;

export const isDataset: (value: unknown) => value is Dataset = pipe(
  Obj.instanceOf(Feed.Feed),
  Predicate.or(Obj.instanceOf(Collection.Collection)),
  Predicate.or(Obj.instanceOf(View.View)),
);
