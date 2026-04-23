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
 * Permissive phone regex. Matches common international and US formats.
 * Intentionally loose — callers should treat the result as a candidate.
 */
const PHONE_REGEX = /(\+?\d[\d\s().-]{7,}\d)/;

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
  if (FREE_MAIL_DOMAINS.has(domain.toLowerCase())) {
    return undefined;
  }
  // Best-effort: use the second-level label, title-cased.
  const labels = domain.split('.');
  if (labels.length === 0) {
    return undefined;
  }
  const base = labels[0];
  if (!base) {
    return undefined;
  }
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const extractLocationsFromBody = (body: string): string[] => {
  // Match "Americas (A, B, C)" / "Offices: A, B, C" style groupings.
  const groupings: string[] = [];
  const parenthesised = body.match(/\(([^()]+)\)/g) ?? [];
  for (const group of parenthesised) {
    const inner = group.slice(1, -1);
    // Heuristic: treat as a location list if it contains at least one comma
    // and at least one capitalised word that looks like a city.
    if (!inner.includes(',')) {
      continue;
    }
    for (const token of inner.split(LOCATION_SPLIT_REGEX)) {
      const trimmed = token.trim();
      if (trimmed.length > 1 && /^[A-Z]/.test(trimmed) && !/^https?:/i.test(trimmed)) {
        groupings.push(trimmed);
      }
    }
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
