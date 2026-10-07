//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
// Person is referenced in Actor.Actor's inferred type; importing it keeps that type nameable.
import { Actor, type Person } from '@dxos/types';

import * as Payload from './Payload.ts';

/**
 * One immutable entry in an agent trajectory; every conversation state (history, queue, alarms, bindings, threads)
 * is a reduction over the feed's events in feed order.
 */
export class Event extends Type.makeObject<Event>(DXN.make('org.dxos.type.trajectory.event', '0.1.0'))(
  Schema.Struct({
    /** Thread the event belongs to: the id of its `threadOpen` event, absent for the main thread. */
    thread: Schema.optional(Payload.EventId),
    /** Writer's head of `thread` when appending, so concurrent writers can be detected. */
    prev: Schema.optional(Payload.EventId),
    actor: Actor.Actor,
    /** ISO timestamp; display only, ordering is by feed position. */
    created: Schema.String.pipe(Annotation.GeneratorAnnotation.set('date.iso8601')),
    payload: Payload.Any,
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--path--regular', hue: 'indigo' })),
) {}

/**
 * An event narrowed to one payload kind.
 */
export type EventOf<T extends Payload.Tag> = Event & { readonly payload: Payload.Of<T> };

export type MakeProps<T extends Payload.Any = Payload.Any> = {
  payload: T;
  actor: Actor.Actor;
  thread?: Payload.EventId;
  prev?: Payload.EventId;
  created?: string;
};

/**
 * Creates an event (not yet appended to a feed).
 */
export const make = <T extends Payload.Any>({ payload, actor, thread, prev, created }: MakeProps<T>): Event =>
  Obj.make(Event, {
    thread,
    prev,
    actor,
    created: created ?? new Date().toISOString(),
    payload,
  });

/**
 * Narrows an event by payload tag.
 */
export const is = <T extends Payload.Tag>(event: Event, tag: T): event is EventOf<T> => event.payload._tag === tag;

export type { Person };
