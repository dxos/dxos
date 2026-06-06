//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TagIndex } from '@dxos/app-toolkit';
import { Annotation, type Database, DXN, Feed, Filter, Obj, Ref, Tag, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

import { Provider } from './Provider';

/** System {@link Tag} foreign key for the user-applied star flag on a Result (within a Search). */
export const STARRED_TAG = { source: 'org.dxos.plugin.commerce', id: 'starred' };

/** A user's saved product search configuration. */
export const Search = Schema.Struct({
  name: Schema.String.pipe(Schema.annotations({ title: 'Name' }), Schema.optional),
  providers: Schema.Array(Ref.Ref(Provider)),
  /** Values for the union of provider fields, keyed by field name. */
  params: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(FormInputAnnotation.set(false)),
  /** Backing ECHO feed (queue) of immutable Result entries appended by each run. */
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
  /** Per-Result tags keyed by tag uri → Result ids (the `starred` flag — see {@link STARRED_TAG}). */
  tags: TagIndex.field(),
  /**
   * Timestamp of the last run; persisted metadata, hidden from forms.
   * Run progress itself is ephemeral UI state (see SearchForm), not a persisted property.
   */
  lastRunAt: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--shopping-cart--regular', hue: 'cyan' }),
  Type.makeObject(DXN.make('org.dxos.type.commerce.Search', '0.1.0')),
);
export type Search = Type.InstanceType<typeof Search>;

/** Checks if a value is a Search object. */
export const instanceOf = (value: unknown): value is Search => Obj.instanceOf(Search, value);

/** Creates a Search with a backing results feed; providers and params default to empty. */
export const make = (
  props: Omit<Obj.MakeProps<typeof Search>, 'providers' | 'params' | 'feed' | 'tags'> & {
    providers?: Ref.Ref<Provider>[];
    params?: Record<string, unknown>;
  } = {},
): Search => {
  const feed = Feed.make();
  const search = Obj.make(Search, {
    ...props,
    providers: props.providers ?? [],
    params: props.params ?? {},
    feed: Ref.make(feed),
  });
  Obj.setParent(feed, search);
  return search;
};

/** Resolves the uri of the `starred` {@link Tag} if it exists (does not create one). Async. */
export const findStarredUri = async (db: Pick<Database.Database, 'query'>): Promise<string | undefined> => {
  const [tag] = await db.query(Filter.foreignKeys(Tag.Tag, [STARRED_TAG])).run();
  return tag ? Obj.getURI(tag).toString() : undefined;
};

/** Whether a Result is starred in this Search (pure; resolve the uri first via {@link findStarredUri}). */
export const isStarred = (search: Search, resultId: string, starredUri: string | undefined): boolean =>
  starredUri ? TagIndex.bind(search, 'tags').objects(starredUri).includes(resultId) : false;

/** Sets/clears the `starred` tag on a Result in this Search (find-or-creates the Tag object). Async. */
export const setStarred = async (
  search: Search,
  resultId: string,
  db: Pick<Database.Database, 'query' | 'add'>,
  value: boolean,
): Promise<void> => {
  const tag = await Tag.findOrCreate(db, { key: STARRED_TAG, label: 'Starred', hue: 'amber' });
  const uri = Obj.getURI(tag).toString();
  const tags = TagIndex.bind(search, 'tags');
  if (value) {
    tags.setTag(uri, resultId);
  } else {
    tags.unsetTag(uri, resultId);
  }
};
