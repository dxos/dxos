//
// Copyright 2026 DXOS.org
//

import { type Message } from '@dxos/types';

export type ActorRole = 'from' | 'to' | 'cc';

export type ExtractedActor = {
  readonly role: ActorRole;
  readonly email: string;
  readonly name?: string;
};

const cleanName = (name: string): string | undefined => {
  const trimmed = name
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

// Parses an RFC5322 address-list header string (e.g. `"A B" <a@b.com>, c@d.com`) into entries.
const parseAddressList = (raw: string): { email: string; name?: string }[] =>
  raw.split(',').flatMap((part) => {
    const text = part.trim();
    const angle = text.match(/^(.*?)<([^>]+)>$/);
    if (angle) {
      return [{ email: angle[2].trim().toLowerCase(), name: cleanName(angle[1]) }];
    }
    const bare = text.match(/[^\s<>@]+@[^\s<>@]+/);
    return bare ? [{ email: bare[0].toLowerCase() }] : [];
  });

const readAddressField = (value: unknown): { email: string; name?: string }[] => {
  if (typeof value === 'string') {
    return parseAddressList(value);
  }
  if (Array.isArray(value)) {
    return value.flatMap(readAddressField);
  }
  if (value && typeof value === 'object' && 'email' in value) {
    const record = value as { email?: unknown; name?: unknown };
    return record.email
      ? [{ email: String(record.email).toLowerCase(), name: typeof record.name === 'string' ? record.name : undefined }]
      : [];
  }
  return [];
};

/**
 * Extracts all actors from a message — sender (`from`) plus `to`/`cc` recipients parsed from the
 * message properties. Deterministic (header parsing, no LLM), so results are model-independent.
 */
export const extractActors = (message: Message.Message): ExtractedActor[] => {
  const actors: ExtractedActor[] = [];
  if (message.sender?.email) {
    actors.push({ role: 'from', email: message.sender.email.toLowerCase(), name: message.sender.name });
  }
  for (const address of readAddressField(message.properties?.to)) {
    actors.push({ role: 'to', ...address });
  }
  for (const address of readAddressField(message.properties?.cc)) {
    actors.push({ role: 'cc', ...address });
  }
  return actors;
};

/** Domain of an email address (a coarse organization key), or undefined. */
export const emailDomain = (email: string): string | undefined => email.split('@')[1]?.toLowerCase();
