//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { DXN, Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { FeedAnnotation, TagIndex } from '@dxos/schema';

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
