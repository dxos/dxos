import * as Schema from 'effect/Schema';
import * as Collection from './Collection';
import * as View from './View';
import * as Type from './Type';
import * as Obj from './Obj';
import { pipe, Predicate } from 'effect';

/**
 * Abstart set of objects, represented by a view, feed, or collection.
 */
export const Dataset = Schema.Union(Type.Feed, Collection.Collection, View.View);
export type Dataset = Type.Feed | Collection.Collection | View.View;

export const isDataset: (value: unknown) => value is Dataset = pipe(
  Obj.instanceOf(Type.Feed),
  Predicate.or(Obj.instanceOf(Collection.Collection)),
  Predicate.or(Obj.instanceOf(View.View)),
);
