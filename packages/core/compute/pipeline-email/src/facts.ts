//
// Copyright 2026 DXOS.org
//

import { type ExtractDocument, type ExtractOptions } from '@dxos/semantic-index';
import { Message } from '@dxos/types';

// Email-specific extraction guidance appended after the semantic-index DEFAULT_EXTRACTION_RULES.
// Kept atomic so the two rule sets compose without forking the base prompt.
export const EMAIL_EXTRACTION_RULES: readonly string[] = [
  'Treat a request or promise as a commitment: "please send X by Friday" => subject (the owner), predicate "owes"/"will send", object X, validTo the deadline.',
  'A deadline or due date becomes validTo on the relevant assertion (ISO date when known).',
  'Attribute first-person statements ("I will…", "we can…") to the message sender as subject.',
];

export const EMAIL_EXTRACT_OPTIONS: ExtractOptions = { rules: EMAIL_EXTRACTION_RULES };

// Stable per-message identifier used as the fact `source` and the incremental cursor key. Prefer the
// RFC message-id header (present in the Enron dataset); fall back to sender+timestamp so every message
// has a deterministic source even when the header is absent.
export const messageSource = (message: Message.Message): string => {
  const messageId = message.properties?.messageId;
  if (typeof messageId === 'string' && messageId.length > 0) {
    return messageId;
  }
  return `${message.sender.email ?? 'unknown'}:${message.created}`;
};

export const messageToDocument = (message: Message.Message): ExtractDocument => ({
  text: Message.extractText(message),
  source: messageSource(message),
  ...(message.sender.email ? { author: message.sender.email } : {}),
  date: message.created,
});
