//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { type MakeOptional } from '@dxos/util';

import * as Actor from './Actor';
import * as Message from './Message';

/**
 * An emoji reaction to a message, appended to the same feed as its target.
 *
 * Reactions are per-author immutable items folded at read time rather than a field on `Message`:
 * feeds resolve conflicts as last-flush-wins over the whole object, so state that several
 * participants mutate cannot live on a single shared item. Un-reacting tombstones the author's own
 * reaction.
 */
export class Reaction extends Type.makeObject<Reaction>(DXN.make('org.dxos.type.reaction', '0.1.0'))(
  Schema.Struct({
    /** Message being reacted to; resolves within the same feed. */
    target: Ref.Ref(Message.Message),
    /** Unicode emoji (e.g. `👍`). */
    emoji: Schema.String,
    sender: Actor.Actor.pipe(Schema.annotations({ description: 'Identity of the reacting participant.' })),
    /** Reaction timestamp. NOTE: May be different from the object creation timestamp. */
    created: Schema.String.pipe(
      Schema.annotations({ description: 'ISO date string when the reaction was sent.' }),
      Annotation.GeneratorAnnotation.set('date.iso8601'),
    ),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--smiley--regular', hue: 'amber' })),
) {}

export const instanceOf = (value: unknown): value is Reaction => Obj.instanceOf(Reaction, value);

export const make = ({
  created,
  sender,
  ...rest
}: MakeOptional<Omit<Obj.MakeProps<typeof Reaction>, 'sender'>, 'created'> & {
  sender: Actor.Actor | Actor.Role;
}) =>
  Obj.make(Reaction, {
    created: created ?? new Date().toISOString(),
    sender: typeof sender === 'string' ? { role: sender } : sender,
    ...rest,
  });
