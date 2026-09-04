//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Annotation, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import * as ConnectorAnnotations from '@dxos/plugin-connector/ConnectorAnnotations';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { FeedAnnotation, TagIndex } from '@dxos/schema';

export const SKILL_KEY = 'org.dxos.skill.calendar';

/** Calendar object schema. */
export class Calendar extends Type.makeObject<Calendar>(DXN.make('org.dxos.type.calendar', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    feed: Ref.Ref(Feed.Feed).pipe(Annotation.SetParent.set(true), FormInputAnnotation.set(false)),
    // Inverse tag index for immutable feed Events (e.g. the "starred" tag): events are immutable Queue
    // items, so their tag associations live in this child `TagIndex` rather than in object meta.
    tags: Ref.Ref(TagIndex.TagIndex).pipe(Annotation.SetParent.set(true), FormInputAnnotation.set(false)),
  }).pipe(
    FeedAnnotation.set({ property: 'feed' }),
    Annotation.IconAnnotation.set({ icon: 'ph--calendar--regular', hue: 'rose' }),
    Skill.SkillsAnnotation.set([SKILL_KEY]),
    // Offer "Connect" in the calendar toolbar; bind the calendar as the new connection's sync target.
    // Providers are resolved from the registry — see `Mailbox`.
    ConnectorAnnotations.ConnectorAuthAnnotation.set({
      connectorIds: ConnectorSpec.idsForTarget,
      bindTarget: true,
    }),
  ),
) {}

/** Checks if a value is a Calendar object. */
export const instanceOf = (value: unknown): value is Calendar => Obj.instanceOf(Calendar, value);

export const CreateCalendarSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
});

type CalendarProps = Omit<Obj.MakeProps<typeof Calendar>, 'feed' | 'tags'>;

/** Creates a calendar object with a backing feed and tag index. */
export const make = (props: CalendarProps = {}) => {
  const feed = Feed.make();
  const tags = TagIndex.make();
  // The feed and tag index are children (`SetParent`): both cascade-delete with the calendar.
  return Obj.make(Calendar, {
    feed: Ref.make(feed),
    tags: Ref.make(tags),
    ...props,
  });
};
