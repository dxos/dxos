//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Obj, Type } from '@dxos/echo';
import { type ExtractInput, type ExtractResult, type MatchResult, type ObjectExtractor } from '@dxos/extractor';
import { Message } from '@dxos/types';

import { buildContactGraph } from './contact.ts';
import { isAutomatedSender, senderSignals } from './selection.ts';

export const TEMPLATE_ID = 'org.dxos.extractor.contact';

/** Any message with a sender email is a candidate; low confidence so domain-specific extractors outrank it. */
export const matchMessage = (source: Obj.Any): MatchResult => {
  const matched = !!(source as Message.Message).sender?.email;
  return matched ? { matched: true, confidence: 0.1, reason: 'sender-email' } : { matched: false };
};

/**
 * Turns the sender into a Person plus their Organization — linked when the domain resolves to a
 * known Organization, freshly created (placeholder name/website from the domain) when it does not
 * and the domain is corporate. Deterministic (`R = never`): requires neither `Resolver` nor
 * `AiService`, so it composes into contexts without those layers (e.g. a streaming pipeline
 * stage). Does NOT write to the database.
 */
export const extractContact = ({ db, source }: ExtractInput): Effect.Effect<ExtractResult, never> =>
  Effect.gen(function* () {
    // `dispatch` may invoke an explicitly-selected extractor without `match()`, so guard a
    // sender-less message rather than crashing in `buildContactGraph`.
    const message = source as Message.Message;
    const sender = message.sender;
    if (!sender) {
      return { created: [], updated: [], relations: [] };
    }

    // A machine is never a contact. Only the deny half of the contact gate applies here: this
    // extractor runs per message, so it has no outbound/known-organization evidence to satisfy the
    // full allow-list — but running with NO gate at all (as it did) turned every `no-reply@`,
    // `mailer-daemon@` and `invoice+statements+acct_…@stripe.com` sender in a mailbox into a Person.
    if (isAutomatedSender(sender.email, senderSignals(message))) {
      return { created: [], updated: [], relations: [] };
    }
    const { contact, organization } = yield* buildContactGraph(sender, db);
    return {
      created: [organization, contact].filter((object): object is NonNullable<typeof object> => !!object),
      updated: [],
      relations: [],
    };
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
