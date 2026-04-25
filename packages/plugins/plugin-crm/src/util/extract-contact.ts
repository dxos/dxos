//
// Copyright 2026 DXOS.org
//

import { Message } from '@dxos/types';

/**
 * Structured output of the email-signature extractor. Pure function; computed
 * from a Message's sender + text blocks.
 */
export type ContactExtract = {
  fullName?: string;
  email: string;
  phone?: string;
  orgName?: string;
  orgDomain?: string;
  locations?: string[];
  urls?: string[];
  isFreeMailDomain: boolean;
};

/**
 * Conservative allowlist of free-mail / personal-email domains. When the
 * sender address is from one of these, the domain does not signal an
 * employing Organization.
 */
export const FREE_MAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'yahoo.com',
  'ymail.com',
  'protonmail.com',
  'proton.me',
  'aol.com',
  'gmx.com',
  'fastmail.com',
  'mail.com',
]);

/**
 * Permissive phone regex. Matches common international and US formats,
 * including US-style numbers with a leading parenthesised area code.
 * Intentionally loose — callers should treat the result as a candidate.
 */
const PHONE_REGEX = /(\+?\(?\d[\d\s().-]{7,}\d)/;

/**
 * URL regex (without a leading scheme requirement so that bare www.example.com
 * strings in signature blocks are captured).
 */
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/**
 * Parses free-form "offices" / "locations" strings commonly found in
 * signature blocks, e.g. "Americas (New York, San Francisco, ...)" or
 * "New York | San Francisco | London".
 */
const LOCATION_SPLIT_REGEX = /[,;|]/;

/**
 * Known multi-label public suffixes. Exhaustive coverage requires a full
 * public-suffix list, but this handles the common cases so that
 * `pickOrgNameFromDomain` walks past them to the actual organization label.
 */
const KNOWN_PUBLIC_SUFFIXES: ReadonlySet<string> = new Set([
  'co.uk',
  'co.jp',
  'co.kr',
  'co.nz',
  'co.za',
  'com.au',
  'com.br',
  'com.mx',
  'com.sg',
  'com.tr',
  'ac.uk',
  'gov.uk',
  'org.uk',
  'net.au',
  'org.au',
]);

/**
 * Regional labels that commonly precede a parenthesised office/city list
 * in corporate signature blocks ("Americas (New York, ...)").
 */
const REGIONAL_LABELS_REGEX = /\b(americas?|apac|asia[-\s]?pacific|emea|europe|offshore|latam|na|eu)\b/i;

const extractTextFromMessage = (msg: Message.Message): string => {
  const parts: string[] = [];
  for (const block of msg.blocks ?? []) {
    if (block._tag === 'text' && typeof block.text === 'string') {
      parts.push(block.text);
    }
  }
  return parts.join('\n');
};

const pickOrgNameFromDomain = (domain: string): string | undefined => {
  const lower = domain.toLowerCase();
  if (FREE_MAIL_DOMAINS.has(lower)) {
    return undefined;
  }
  const labels = lower.split('.').filter((label) => label.length > 0);
  if (labels.length < 2) {
    return undefined;
  }
  // Walk from the right, skipping the TLD and any known multi-label suffix.
  let skip = 1;
  if (labels.length >= 3) {
    const lastTwo = labels.slice(-2).join('.');
    if (KNOWN_PUBLIC_SUFFIXES.has(lastTwo)) {
      skip = 2;
    }
  }
  const base = labels[labels.length - 1 - skip];
  if (!base) {
    return undefined;
  }
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const extractLocationsFromBody = (body: string): string[] => {
  // Match "Americas (New York, Buenos Aires, ...)" style groupings where a
  // parenthesised list is preceded by a regional label (Americas, EMEA, ...).
  // Falls back to unprefixed parentheses only if the contents look like a
  // list of ≥2 city-like tokens (starts uppercase, ≥2 characters).
  const groupings: string[] = [];
  const regex = /([A-Za-z][\w-\s]*)?\(([^()]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const prefix = match[1]?.trim() ?? '';
    const inner = match[2];
    if (!inner || !inner.includes(',')) {
      continue;
    }
    const hasRegionalLabel = REGIONAL_LABELS_REGEX.test(prefix);
    const candidates: string[] = [];
    for (const token of inner.split(LOCATION_SPLIT_REGEX)) {
      const trimmed = token.trim();
      if (trimmed.length > 1 && /^[A-Z]/.test(trimmed) && !/^https?:/i.test(trimmed)) {
        candidates.push(trimmed);
      }
    }
    if (candidates.length === 0) {
      continue;
    }
    // Without a regional prefix, require ≥2 city-like candidates to avoid
    // absorbing parenthetical asides such as "(Deel, Mykola)".
    if (!hasRegionalLabel && candidates.length < 2) {
      continue;
    }
    groupings.push(...candidates);
  }
  // Dedupe, preserving order.
  return Array.from(new Set(groupings));
};

/**
 * Extract a structured contact record from an email Message.
 * Pure, synchronous, dependency-free.
 */
export const extractContactFromMessage = (msg: Message.Message): ContactExtract => {
  const sender = msg.sender ?? {};
  const email = (sender.email ?? '').trim();
  const fullName = (sender.name ?? '').trim() || undefined;

  const atIdx = email.indexOf('@');
  const orgDomain = atIdx >= 0 ? email.slice(atIdx + 1).toLowerCase() : undefined;
  const isFreeMailDomain = orgDomain ? FREE_MAIL_DOMAINS.has(orgDomain) : false;

  const body = extractTextFromMessage(msg);

  const phoneMatch = body.match(PHONE_REGEX);
  const phone = phoneMatch ? phoneMatch[1].trim() : undefined;

  const urlMatches = body.match(URL_REGEX);
  const urls = urlMatches ? Array.from(new Set(urlMatches.map((u) => u.trim()))) : undefined;

  const locations = extractLocationsFromBody(body);

  const orgName = orgDomain ? pickOrgNameFromDomain(orgDomain) : undefined;

  return {
    fullName,
    email,
    phone,
    orgName,
    orgDomain,
    locations: locations.length > 0 ? locations : undefined,
    urls: urls && urls.length > 0 ? urls : undefined,
    isFreeMailDomain,
  };
};
