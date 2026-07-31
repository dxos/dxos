//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { type Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { generateText, parseJsonObject } from '../llm';
import { type ModelVariant } from '../models';
import { emailDomain } from './contacts';

// Sender-type triage (REPORT §5): classify each sender as a PERSON (an individual human) or an ORG
// (automated / organizational — invoices, newsletters, notifications, no-reply). This gates all
// downstream LLM spend: only people get draft replies, and org mail gets a one-line label instead of
// a full summary. The stage runs at two costs — a deterministic HEURISTIC (foreground, zero-latency)
// and a cheap LLM fallback — so the ground-truth eval can measure whether the heuristic alone is
// enough, or where the LLM earns its cost.

export type SenderClass = 'person' | 'org';

/** A unique sender aggregated over the corpus — the unit of classification (dedup by email). */
export type SenderInfo = {
  readonly email: string;
  readonly name?: string;
  /** Messages received from this sender. */
  readonly count: number;
  /** Representative subjects (most recent first), signal for the LLM classifier. */
  readonly subjects: readonly string[];
};

export type SenderResult = {
  readonly email: string;
  readonly class: SenderClass;
  /** 0..1 confidence; the hybrid path defers low-confidence heuristic calls to the LLM. */
  readonly confidence: number;
  readonly method: 'heuristic' | 'llm';
};

/**
 * Aggregates messages into unique senders (keyed by lowercased email), newest subject first and with
 * a message count. Classification is per-sender, not per-message, so the LLM cost scales with the
 * number of distinct correspondents rather than the feed size.
 */
export const uniqueSenders = (messages: readonly Message.Message[]): SenderInfo[] => {
  const byEmail = new Map<string, { name?: string; count: number; subjects: string[] }>();
  // Messages arrive oldest-first (see `loadFixtureMessages`); iterate in reverse so the freshest
  // subject/name lands first.
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    const email = message.sender?.email?.toLowerCase();
    if (!email) {
      continue;
    }
    const entry = byEmail.get(email) ?? { name: undefined, count: 0, subjects: [] };
    entry.count++;
    entry.name ??= message.sender?.name;
    const subject = String(message.properties?.subject ?? '').trim();
    if (subject && entry.subjects.length < 3 && !entry.subjects.includes(subject)) {
      entry.subjects.push(subject);
    }
    byEmail.set(email, entry);
  }
  return [...byEmail.entries()]
    .map(([email, entry]) => ({ email, name: entry.name, count: entry.count, subjects: entry.subjects }))
    .sort((left, right) => right.count - left.count);
};

//
// Heuristic classifier — deterministic, foreground, zero-latency.
//

// Local-part tokens that mark an automated / role mailbox (org). Matched against the tokens of the
// local part (split on non-alphanumerics), so `no-reply`, `noreply`, `bounces+123` all hit.
const ROLE_TOKENS = new Set([
  'noreply',
  'no',
  'reply',
  'donotreply',
  'notification',
  'notifications',
  'notify',
  'alert',
  'alerts',
  'update',
  'updates',
  'news',
  'newsletter',
  'newsletters',
  'support',
  'helpdesk',
  'help',
  'info',
  'hello',
  'contact',
  'team',
  'sales',
  'billing',
  'invoice',
  'invoices',
  'receipt',
  'receipts',
  'payment',
  'payments',
  'account',
  'accounts',
  'admin',
  'postmaster',
  'mailer',
  'daemon',
  'bounce',
  'bounces',
  'marketing',
  'promo',
  'promotions',
  'offers',
  'deals',
  'careers',
  'jobs',
  'feedback',
  'survey',
  'orders',
  'shipping',
  'service',
  'services',
  'member',
  'members',
  'membership',
  'community',
  'digest',
  'auto',
  'automated',
  'system',
  'robot',
  'bot',
  'webmaster',
  'security',
  'verify',
  'verification',
  'confirm',
  'welcome',
  'care',
  'do-not-reply',
]);

// Display-name markers that signal an organization rather than a person.
const COMPANY_NAME_RE =
  /\b(inc|llc|ltd|gmbh|corp|co|company|team|support|notifications?|newsletter|updates?|billing|no-?reply|the\s)\b/i;

const localPart = (email: string): string => email.split('@')[0] ?? '';

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

// Common free-mail providers: a personal-looking local part here is a strong person signal.
const FREE_MAIL = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'gmx.com',
  'fastmail.com',
]);

// A name-shaped local part: mostly letters, at most one separator, not digit-heavy (e.g. `jane.doe`,
// `jdoe`, `rich`). Opaque or numeric local parts (`u123456`, `bounce-af93b2`) are not person-shaped.
const isNameShaped = (local: string): boolean => {
  const letters = (local.match(/[a-z]/gi) ?? []).length;
  const digits = (local.match(/[0-9]/g) ?? []).length;
  const separators = (local.match(/[._-]/g) ?? []).length;
  return letters >= 3 && digits <= 2 && separators <= 1 && letters >= local.length - 3;
};

// A display name shaped like a human name: two+ capitalized words, no company marker.
const isPersonName = (name: string | undefined): boolean => {
  if (!name || COMPANY_NAME_RE.test(name)) {
    return false;
  }
  const words = name.trim().split(/\s+/);
  return words.length >= 2 && words.every((word) => /^[A-Z][a-zA-Z'’.-]*$/.test(word));
};

/**
 * Deterministic best-guess classification with a confidence. Role/automated local parts and company
 * display names are strong ORG signals; free-mail personal addresses and human-shaped display names
 * are strong PERSON signals; everything else is a low-confidence guess the hybrid path can defer to
 * the LLM. Never rejects — always returns a class.
 */
export const classifySenderHeuristic = (sender: SenderInfo): SenderResult => {
  const email = sender.email.toLowerCase();
  const local = localPart(email);
  const domain = emailDomain(email);
  const decide = (klass: SenderClass, confidence: number): SenderResult => ({
    email,
    class: klass,
    confidence,
    method: 'heuristic',
  });

  // Strong ORG: an automated / role mailbox.
  if (tokenize(local).some((token) => ROLE_TOKENS.has(token))) {
    return decide('org', 0.95);
  }
  // Strong ORG: a company-shaped display name.
  if (sender.name && COMPANY_NAME_RE.test(sender.name)) {
    return decide('org', 0.85);
  }
  // Strong PERSON: a human-shaped display name.
  if (isPersonName(sender.name)) {
    return decide('person', 0.9);
  }
  // PERSON: a personal-looking address on a free-mail provider.
  if (domain && FREE_MAIL.has(domain) && isNameShaped(local)) {
    return decide('person', 0.85);
  }
  // Weak PERSON: a name-shaped local part on a corporate domain (e.g. rich@braneframe.com).
  if (isNameShaped(local)) {
    return decide('person', 0.65);
  }
  // Fallback ORG: opaque / numeric local part with no personal signal.
  return decide('org', 0.6);
};

//
// LLM classifier — cheap fallback for the ambiguous cases.
//

const PROMPT = trim`
  Classify the sender of these emails as either a real individual PERSON or an ORGANIZATION /
  automated system (newsletters, invoices, notifications, no-reply, support, marketing).
  Judge by the address, display name, and subjects. Respond with ONLY a JSON object of the form
  {"class": "person" | "org"}.
`;

/** Classifies a sender via the variant's model. Degrades to a low-confidence heuristic on empty output. */
export const classifySender = (
  sender: SenderInfo,
  variant: ModelVariant,
): Effect.Effect<SenderResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const subjects = sender.subjects.length ? sender.subjects.map((subject) => `- ${subject}`).join('\n') : '(none)';
    const raw = yield* generateText(
      variant.model,
      variant.provider,
      `${PROMPT}\n\nName: ${sender.name ?? '(none)'}\nEmail: ${sender.email}\nSubjects:\n${subjects}`,
    );
    const parsed = parseJsonObject<{ class?: unknown }>(raw, {});
    const klass = String(parsed.class ?? '').toLowerCase();
    if (klass === 'person' || klass === 'org') {
      return { email: sender.email, class: klass, confidence: 1, method: 'llm' as const };
    }
    // Empty / unparseable output — fall back to the heuristic rather than scoring as wrong.
    return { ...classifySenderHeuristic(sender), method: 'llm' as const };
  });

/**
 * Hybrid strategy: trust the heuristic when it is confident (≥ `threshold`), otherwise defer to the
 * model. This is the product-intended path — it spends LLM cost only on the ambiguous senders the
 * heuristic cannot resolve.
 */
export const classifySenderHybrid =
  (threshold = 0.9) =>
  (sender: SenderInfo, variant: ModelVariant): Effect.Effect<SenderResult, never, AiService.AiService> => {
    const heuristic = classifySenderHeuristic(sender);
    return heuristic.confidence >= threshold ? Effect.succeed(heuristic) : classifySender(sender, variant);
  };
