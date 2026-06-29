//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

export const SKILL_KEY = 'org.dxos.skill.support';

export const TicketStatus = Schema.Literal('open', 'in_progress', 'resolved');
export type TicketStatus = Schema.Schema.Type<typeof TicketStatus>;

/**
 * A user-reported support ticket. Chat history lives in the standard chat
 * companion; this object is the persistent record of the issue and its
 * resolution.
 */
export class Ticket extends Type.makeObject<Ticket>(DXN.make('org.dxos.type.support.ticket', '0.1.0'))(
  Schema.Struct({
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
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--lifebuoy--regular', hue: 'rose' }),
    AppAnnotation.SkillsAnnotation.set([SKILL_KEY]),
  ),
) {}

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
