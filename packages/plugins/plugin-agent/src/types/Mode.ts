//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Chat from '@dxos/assistant/Chat';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';

import * as Memory from './Memory.ts';

/**
 * A reusable bundle of skills the agent works in — interviewer, note-taker, relay (docs/ONTOLOGY.md
 * §3 "Mode"). Owned by the agent; a chat's current mode is recorded on the chat (see {@link getCurrent}).
 */
export class Mode extends Type.makeObject<Mode>(DXN.make('org.dxos.type.agent.mode', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.annotate({ title: 'Name' }),
    description: Schema.optional(Schema.String.annotate({ title: 'Description' })),
    skills: Schema.Array(Ref.Ref(Skill.Skill)).annotate({
      title: 'Skills',
      description: 'The skills bound to a conversation while it is in this mode.',
    }),
    records: Schema.optional(
      Schema.Array(Memory.Kind).annotate({ title: 'Records', description: 'The kinds of memory this mode writes.' }),
    ),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--sliders-horizontal--regular', hue: 'sky' }),
  ),
) {}

export type MakeProps = Omit<Obj.MakeProps<typeof Mode>, 'skills'> & {
  skills?: Obj.MakeProps<typeof Mode>['skills'];
};

export const make = ({ skills, ...props }: MakeProps): Mode =>
  Obj.make(Mode, { ...props, skills: [...(skills ?? [])] });

/** The default mode of a new conversation. */
export const DEFAULT = 'Conversation';

/**
 * The name of the chat's current mode. An object annotation rather than an `Obj.Meta` key because
 * `Agent.loadChat` treats any keyed chat as bridged, never primary.
 */
export const CurrentModeAnnotation = Annotation.make({
  id: 'org.dxos.agent.chatMode',
  schema: Schema.String,
});

/** The chat's current mode name; {@link DEFAULT} when none was set. */
export const getCurrent = (chat: Chat.Chat): string =>
  Annotation.get(chat, CurrentModeAnnotation).pipe(Option.getOrElse(() => DEFAULT));

/** Sets the chat's current mode; call inside the caller's `Obj.update`, so it batches with the chat's other writes. */
export const setCurrent = (chat: Obj.Mutable<Chat.Chat>, name: string): void => {
  Annotation.set(chat, CurrentModeAnnotation, name);
};
