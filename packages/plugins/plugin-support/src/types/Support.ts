//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation, SystemTypeAnnotation } from '@dxos/echo/internal';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.support';
export const COMPOSER_BLUEPRINT_KEY = 'org.dxos.blueprint.composer';

export const TicketStatus = Schema.Literal('open', 'in_progress', 'resolved');
export type TicketStatus = Schema.Schema.Type<typeof TicketStatus>;

/**
 * A user-reported support ticket. Chat history lives in the standard chat
 * companion; this object is the persistent record of the issue and its
 * resolution.
 */
export const Ticket = Schema.Struct({
  title: Schema.String.annotations({
    description: 'Short summary of the issue.',
  }),
  body: Schema.optional(
    Schema.String.annotations({
      description: 'Initial description of the problem.',
    }),
  ),
  status: TicketStatus.pipe(FormInputAnnotation.set(false)),
  resolution: Schema.optional(
    Schema.String.annotations({
      description: 'Resolution notes recorded when the ticket is resolved.',
    }),
  ),
  tags: Schema.optional(Schema.Array(Schema.String).pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.support.ticket',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({
    icon: 'ph--lifebuoy--regular',
    hue: 'rose',
  }),
  BlueprintsAnnotation.set([BLUEPRINT_KEY]),
);

export interface Ticket extends Schema.Schema.Type<typeof Ticket> {}

/**
 * Creates a Ticket with default lifecycle fields (status: 'open', empty tags).
 */
export const make = (props: { title?: string; body?: string } = {}) =>
  Obj.make(Ticket, {
    title: props.title ?? 'New ticket',
    body: props.body,
    status: 'open',
    tags: [],
  });

/**
 * Runtime type guard for Ticket ECHO objects.
 */
export const instanceOf = (value: unknown): value is Ticket => Obj.instanceOf(Ticket, value);

/**
 * Singleton anchor for the Welcome surface. Lives in the personal space; backs
 * the welcome virtual node so the assistant chat companion (which binds to ECHO
 * objects) attaches automatically.
 */
export const Welcome = Schema.Struct({}).pipe(
  Type.object({
    typename: 'org.dxos.type.support.welcome',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--lifebuoy--regular',
    hue: 'rose',
  }),
  BlueprintsAnnotation.set([COMPOSER_BLUEPRINT_KEY, BLUEPRINT_KEY]),
  // Keep out of the navtree's typed branches — surfaced only via the welcome virtual node.
  SystemTypeAnnotation.set(true),
);

export interface Welcome extends Schema.Schema.Type<typeof Welcome> {}

export const makeWelcome = (): Welcome => Obj.make(Welcome, {});
