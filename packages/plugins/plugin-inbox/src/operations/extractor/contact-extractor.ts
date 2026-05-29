//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { type Obj, Type } from '@dxos/echo';
import { type ExtractInput, type ExtractResult, type MatchResult, type ObjectExtractor } from '@dxos/extractor';
import { Message } from '@dxos/types';

import { InboxOperation } from '../../types';
import { buildContactFromActor } from './contact';

export const ID = 'org.dxos.plugin.inbox.extractor.contact';

const matchMessage = (source: Obj.Any): MatchResult => {
  // Any message with a sender email is a candidate. Low confidence so domain-specific extractors
  // (e.g. travel) outrank this when both match.
  const matched = !!(source as Message.Message).sender?.email;
  return matched ? { matched: true, confidence: 0.1, reason: 'sender-email' } : { matched: false };
};

/** Turns the sender into a Person (+ Organization link by domain) via the shared helper. */
const extract = ({ db, source }: ExtractInput): Effect.Effect<ExtractResult, never> =>
  Effect.gen(function* () {
    const contact = yield* buildContactFromActor((source as Message.Message).sender, db);
    return { created: contact ? [contact] : [], updated: [], relations: [] };
  });

/**
 * Operation handler — wraps the inline `extract` so the extractor is also a first-class
 * registered operation. Does NOT write to the database; the dispatcher persists.
 */
const handler: Operation.WithHandler<typeof InboxOperation.ExtractContactFromMessage> =
  InboxOperation.ExtractContactFromMessage.pipe(Operation.withHandler(extract));

export default handler;

/**
 * Creates a Person from a message's sender, linking to an existing Organization when a
 * matching domain is found. Does NOT attach an `ExtractedFrom` relation back to the message:
 * `Message.sender` already references the actor, so a provenance edge would duplicate that
 * linkage and clutter the message header with a redundant chip alongside the sender row.
 */
export const ContactMessageExtractor: ObjectExtractor = {
  id: ID,
  title: 'Contact',
  description: 'Create contact from message sender',
  kinds: ['contact'],
  sourceTypes: [Type.getTypename(Message.Message)!],
  match: matchMessage,
  operation: InboxOperation.ExtractContactFromMessage,
  extract,
  createRelation: false,
};
