//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Chat from '@dxos/assistant/Chat';
import { Annotation, Obj } from '@dxos/echo';

/**
 * The person an agent's chat is with, as their entity id. An object annotation rather than an
 * `Obj.Meta` key because `Agent.loadChat` treats any keyed chat as bridged, never primary.
 */
export const ParticipantAnnotation = Annotation.make({
  id: 'org.dxos.agent.chatParticipant',
  schema: Schema.String,
});

/** The entity id of the person the chat is with, if one was assigned. */
export const get = (chat: Chat.Chat): string | undefined =>
  Annotation.get(chat, ParticipantAnnotation).pipe(Option.getOrUndefined);

/** Marks the chat as the conversation with `person`; replaces any earlier participant. */
export const set = (chat: Chat.Chat, person: Obj.Unknown): void => {
  Obj.update(chat, (chat) => {
    Annotation.set(chat, ParticipantAnnotation, person.id);
  });
};
