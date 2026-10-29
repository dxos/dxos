//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, type Database, DXN, Feed, Filter, Obj, Ref, Tag, Type } from '@dxos/echo';
import { Connection } from '@dxos/link';
import { TagIndex } from '@dxos/schema';

/** System {@link Tag} foreign key for the user-applied star on a Finding (within a Research). */
export const STARRED_TAG = { source: 'org.dxos.plugin.lighthouse', id: 'starred' };

/** The budget presets lighthouse offers (see `BUDGETS` in the model). */
export const BudgetPreset = Schema.Literals(['quick', 'standard', 'deep']).annotate({ title: 'Budget' });

export type BudgetPreset = Schema.Schema.Type<typeof BudgetPreset>;

/**
 * A goal handed to a lighthouse search session. Links to the session by run id on one lighthouse connection; holds
 * what the person kept as an append-only feed of Findings.
 */
export class Research extends Type.makeObject<Research>(DXN.make('org.dxos.type.lighthouse.Research', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' }), Schema.optional),
    goal: Schema.String.pipe(Schema.annotate({ title: 'Goal' })),
    budget: BudgetPreset.pipe(Schema.optional),
    /** Search engines to use (lighthouse engine ids); none lets the agent choose. */
    engines: Schema.Array(Schema.String).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
    /** The lighthouse server it runs on. */
    connection: Ref.Ref(Connection.Connection).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
    /** The lighthouse session; set once it starts. */
    run: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
    /** Immutable Finding entries: the session's picks and the results the person starred. */
    feed: Ref.Ref(Feed.Feed).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
    /** Per-Finding tags keyed by tag uri -> Finding ids (the `starred` flag - see {@link STARRED_TAG}). */
    tags: Ref.Ref(TagIndex.TagIndex).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
    lastRunAt: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--binoculars--regular', hue: 'amber' }),
    Annotation.UserType.set(),
  ),
) {}

export const instanceOf = (value: unknown): value is Research => Obj.instanceOf(Research, value);

/** Creates a Research with its findings feed and tag index; both are children and cascade-delete with it. */
export const make = (
  props: Omit<Obj.MakeProps<typeof Research>, 'feed' | 'tags' | 'goal'> & { goal?: string } = {},
): Research =>
  Obj.make(Research, {
    ...props,
    goal: props.goal ?? '',
    budget: props.budget ?? 'quick',
    feed: Ref.make(Feed.make()),
    tags: Ref.make(TagIndex.make()),
  });

/** Whether a Finding is starred in this Research (pure; resolve the uri first via the starred Tag query). */
export const isStarred = (research: Research, findingId: string, starredUri: string | undefined): boolean => {
  const tagIndex = research.tags.target;
  return !!(tagIndex && starredUri) && TagIndex.bind(tagIndex).objects(starredUri).includes(findingId);
};

/** Sets or clears the `starred` tag on a Finding in this Research (find-or-creates the Tag object). */
export const setStarred = async (
  research: Research,
  findingId: string,
  db: Pick<Database.Database, 'query' | 'add'>,
  value: boolean,
): Promise<void> => {
  const tag = await Tag.findOrCreate(db, { key: STARRED_TAG, label: 'Starred', hue: 'amber' });
  const uri = Obj.getURI(tag).toString();
  const tagIndex = research.tags.target;
  if (!tagIndex) {
    return;
  }
  const tags = TagIndex.bind(tagIndex);
  if (value) {
    tags.setTag(uri, Obj.ID.make(findingId));
  } else {
    tags.unsetTag(uri, Obj.ID.make(findingId));
  }
};

/** Resolves the uri of the `starred` {@link Tag} if it exists (does not create one). */
export const findStarredUri = async (db: Pick<Database.Database, 'query'>): Promise<string | undefined> => {
  const [tag] = await db.query(Filter.foreignKeys(Tag.Tag, [STARRED_TAG])).run();
  return tag ? Obj.getURI(tag).toString() : undefined;
};
