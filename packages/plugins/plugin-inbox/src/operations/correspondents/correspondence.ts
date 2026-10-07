//
// Copyright 2026 DXOS.org
//

import { normalizeEmail } from '@dxos/extractor-lib';
import { type Message } from '@dxos/types';

/** A person the user corresponds with, with the sender signals of the message(s) that qualified them. */
export type Correspondent = {
  readonly email: string;
  readonly name?: string;
  /** True when any qualifying message carried an automated-sender signal (no-reply / list mail). */
  readonly automated: boolean;
};

/** `Re:` / `Fwd:` subject prefixes — the header-less signal that a message continues a conversation. */
const REPLY_SUBJECT_RE = /^\s*(?:re|fwd?)\s*(?:\[\d+\])?\s*:/i;

/** Splits an address list on commas outside double quotes, so `"Doe, Jane" <j@d>` stays one entry. */
const splitAddressList = (value: string): string[] => {
  const parts: string[] = [];
  let currentPart = '';
  let quoted = false;
  for (const char of value) {
    if (char === '"') {
      quoted = !quoted;
      currentPart += char;
    } else if (char === ',' && !quoted) {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  parts.push(currentPart);
  return parts;
};

/** Extracts every `name <email>` / bare-email entry from an address-list header string. Lossy but pure. */
export const parseAddressList = (value: unknown): { email: string; name?: string }[] => {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }
  const entries: { email: string; name?: string }[] = [];
  for (const part of splitAddressList(value)) {
    const bracketed = part.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>\s]+@[^>\s]+)>\s*$/);
    if (bracketed) {
      const name = bracketed[1]?.trim();
      entries.push(name ? { email: bracketed[2], name } : { email: bracketed[2] });
      continue;
    }
    const bare = part.match(/([^\s<>,;"]+@[^\s<>,;"]+)/);
    if (bare) {
      entries.push({ email: bare[1] });
    }
  }
  return entries;
};

/** Whether the message continues a conversation: an explicit references chain or a reply/forward subject. */
export const isReplyMessage = (message: Message.Message): boolean => {
  const properties = message.properties ?? {};
  if (typeof properties.references === 'string' && properties.references.length > 0) {
    return true;
  }
  return typeof properties.subject === 'string' && REPLY_SUBJECT_RE.test(properties.subject);
};

/**
 * Derives the user's correspondents — "anyone I have sent or replied to" — from a mailbox feed:
 *
 *  1. recipients (`to`/`cc`) of messages the user sent, and
 *  2. senders of conversation messages (see {@link isReplyMessage}) addressed directly to one of
 *     the user's addresses — an inbound reply implies prior outbound mail, which is the only way to
 *     recover the outbound signal from an inbox-only corpus.
 *
 * Pure. Automated-sender signals (`noReply`, `listUnsubscribe`) are carried per correspondent so the
 * contact gate (`shouldExtractContact`) keeps deny-beats-allow; a correspondent is only `automated`
 * when EVERY qualifying message was automated (one clean personal reply outweighs list mail).
 */
export const deriveCorrespondents = (messages: readonly Message.Message[], me: readonly string[]): Correspondent[] => {
  const mine = new Set(me.map((email) => normalizeEmail(email)).filter((email): email is string => !!email));
  if (mine.size === 0) {
    return [];
  }

  const byEmail = new Map<string, { email: string; name?: string; automated: boolean }>();
  const record = (entry: { email?: string; name?: string }, automated: boolean) => {
    const email = normalizeEmail(entry.email);
    if (!email || mine.has(email)) {
      return;
    }
    const existing = byEmail.get(email);
    if (existing) {
      existing.automated = existing.automated && automated;
      existing.name ??= entry.name;
    } else {
      byEmail.set(email, { email, name: entry.name, automated });
    }
  };

  for (const message of messages) {
    const properties = message.properties ?? {};
    const sender = normalizeEmail(message.sender?.email);
    const automated =
      properties.noReply === true || (typeof properties.listUnsubscribe === 'string' && !!properties.listUnsubscribe);
    if (sender && mine.has(sender)) {
      // Outbound: everyone the user addressed.
      for (const recipient of [...parseAddressList(properties.to), ...parseAddressList(properties.cc)]) {
        record(recipient, automated);
      }
    } else if (isReplyMessage(message)) {
      // Inbound conversation: the sender, when the message is addressed directly to the user.
      const direct = parseAddressList(properties.to).some((entry) => {
        const email = normalizeEmail(entry.email);
        return !!email && mine.has(email);
      });
      if (direct && message.sender) {
        record(message.sender, automated);
      }
    }
  }

  return [...byEmail.values()];
};
