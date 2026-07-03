//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Obj, Type } from '@dxos/echo';
import { type ExtractInput, type ExtractResult, type MatchResult, type ObjectExtractor } from '@dxos/extractor';
import { Message } from '@dxos/types';

import { buildContactFromActor } from './contact';

export const TEMPLATE_ID = 'org.dxos.extractor.contact';

/** Any message with a sender email is a candidate; low confidence so domain-specific extractors outrank it. */
export const matchMessage = (source: Obj.Any): MatchResult => {
  const matched = !!(source as Message.Message).sender?.email;
  return matched ? { matched: true, confidence: 0.1, reason: 'sender-email' } : { matched: false };
};

/**
 * Turns the sender into a Person (+ Organization link by domain) via the shared helper. Deterministic
 * (`R = never`): requires neither `Resolver` nor `AiService`, so it composes into contexts without
 * those layers (e.g. a streaming pipeline stage). Does NOT write to the database.
 */
export const extractContact = ({ db, source }: ExtractInput): Effect.Effect<ExtractResult, never> =>
  Effect.gen(function* () {
    const contact = yield* buildContactFromActor((source as Message.Message).sender, db);
    return { created: contact ? [contact] : [], updated: [], relations: [] };
  });

/**
 * Reusable extractor that creates a Person from a message's sender, linking to an existing
 * Organization when a matching domain is found. Does NOT attach an `ExtractedFrom` relation back
 * to the message: `Message.sender` already references the actor, so a provenance edge would
 * duplicate that linkage. Consumers may spread this and add plugin-specific `id`/`operation`.
 */
export const contactExtractor: ObjectExtractor = {
  id: TEMPLATE_ID,
  title: 'Contact',
  description: 'Create contact from message sender',
  kinds: ['contact'],
  sourceTypes: [Type.getTypename(Message.Message)!],
  match: matchMessage,
  extract: extractContact,
  createRelation: false,
};
