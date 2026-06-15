//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { DXN, Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { FeedAnnotation } from '@dxos/schema';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.calendar';

/** Calendar object schema. */
export const Calendar = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
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

type CalendarProps = Omit<Obj.MakeProps<typeof Calendar>, 'feed'>;

/** Creates a calendar object with a backing feed. */
export const make = (props: CalendarProps = {}) => {
  const feed = Feed.make();
  const calendar = Obj.make(Calendar, {
    feed: Ref.make(feed),
    ...props,
  });
  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(feed, calendar);
  return calendar;
};
