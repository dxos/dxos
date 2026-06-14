//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { DXN, Annotation, type Database, Feed, Obj, Ref, Tag, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { FeedAnnotation, TagIndex, Tagging } from '@dxos/schema';
import { type Event } from '@dxos/types';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.calendar';

/** Calendar object schema. */
export const Calendar = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
  // Inverse tag index for immutable feed Events (e.g. the "starred" tag): events are immutable Queue
  // items, so their tag associations live in this child `TagIndex` rather than in object meta.
  tags: Ref.Ref(TagIndex.TagIndex).pipe(FormInputAnnotation.set(false)),
}).pipe(
  FeedAnnotation.set(true),
  Annotation.IconAnnotation.set({ icon: 'ph--calendar--regular', hue: 'rose' }),
  BlueprintsAnnotation.set([BLUEPRINT_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.calendar', '0.1.0')),
);

export type Calendar = Type.InstanceType<typeof Calendar>;

/** Checks if a value is a Calendar object. */
export const instanceOf = (value: unknown): value is Calendar => Obj.instanceOf(Calendar, value);

export const CreateCalendarSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});

type CalendarProps = Omit<Obj.MakeProps<typeof Calendar>, 'feed' | 'tags'>;

/** Creates a calendar object with a backing feed and tag index. */
export const make = (props: CalendarProps = {}) => {
  const feed = Feed.make();
  const tags = TagIndex.make();
  const calendar = Obj.make(Calendar, {
    feed: Ref.make(feed),
    tags: Ref.make(tags),
    ...props,
  });
  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(feed, calendar);
  Obj.setParent(tags, calendar);
  return calendar;
};

export const TAG_ACTIVE = { label: 'Active', hue: 'teal' } as const;
export const TAG_STARRED = { label: 'Starred', hue: 'amber' } as const;

/** Event ids carrying the starred tag (pass the resolved starred-tag uri). */
export const getStarredEventIds = (
  calendar: Calendar | Obj.Snapshot<Calendar>,
  starredUri: string | undefined,
): ReadonlySet<string> =>
  starredUri && calendar.tags?.target
    ? new Set(TagIndex.bind(calendar.tags.target).objects(starredUri))
    : new Set<string>();

/** Toggle the starred tag on an event, creating the tag (and the calendar's tag index) on first use. */
export const toggleStar = async (calendar: Calendar, event: Event.Event, db: Database.Database): Promise<void> => {
  // Lazily provision the tag index for calendars created before the `tags` field existed.
  let index = calendar.tags?.target;
  if (!index) {
    index = db.add(TagIndex.make());
    Obj.setParent(index, calendar);
    Obj.update(calendar, (calendar) => {
      calendar.tags = Ref.make(index!);
    });
  }
  const tag = await Tag.findOrCreate(db, { label: TAG_STARRED.label, hue: TAG_STARRED.hue });
  const uri = Obj.getURI(tag).toString();
  if (Tagging.get(event, { index }).includes(uri)) {
    Tagging.unset(event, uri, { index });
  } else {
    Tagging.set(event, uri, { index });
  }
};
