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

/**
 * `Obj.Meta` key source of a Composer chat an agent keeps with one person (id = the person's entity
 * id); keyed so `Agent.loadChat` never takes it for the agent's primary chat.
 */
export const PARTICIPANT_SOURCE = 'org.dxos.agent/participant';

/** The entity id of the person the chat is with, if one was assigned. */
export const get = (chat: Chat.Chat): string | undefined =>
  Annotation.get(chat, ParticipantAnnotation).pipe(Option.getOrUndefined);

/**
 * Marks the chat as the conversation with `person`; replaces any earlier participant.
 * Call inside the caller's `Obj.update`, so it batches with the chat's other writes.
 */
export const set = (chat: Obj.Mutable<Chat.Chat>, person: Obj.Unknown): void => {
  Annotation.set(chat, ParticipantAnnotation, person.id);
};

/**
 * The identity (DID) a private chat belongs to: only its owner is shown the chat. An unowned chat is the
 * agent's shared conversation. ECHO has no per-object access control yet, so privacy is enforced by
 * the views that list an agent's chats, not by replication.
 */
export const OwnerAnnotation = Annotation.make({
  id: 'org.dxos.agent.chatOwner',
  schema: Schema.String,
});

/** The DID of the identity the chat is private to, if any. */
export const getOwner = (chat: Chat.Chat): string | undefined =>
  Annotation.get(chat, OwnerAnnotation).pipe(Option.getOrUndefined);

/** Makes the chat private to the identity. Call inside the caller's `Obj.update`. */
export const setOwner = (chat: Obj.Mutable<Chat.Chat>, identityDid: string): void => {
  Annotation.set(chat, OwnerAnnotation, identityDid);
};

/** Whether the identity may see the chat: shared chats are visible to everyone, private ones to their owner. */
export const isVisibleTo = (chat: Chat.Chat, identityDid: string | undefined): boolean => {
  const owner = getOwner(chat);
  return owner === undefined || owner === identityDid;
};

/** `Person.identities` label of a member's HALO identity, so a private chat's person is found by DID. */
export const IDENTITY_LABEL = 'did';
