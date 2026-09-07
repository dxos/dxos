//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Actor, ContentBlock } from '@dxos/types';

/** Stable reference date so regenerations are reproducible. Override with NOW=2026-05-20 env. */
export const REFERENCE = process.env.NOW ? new Date(process.env.NOW) : new Date('2026-05-20T15:00:00Z');

/**
 * Bound to the same reference the definition declares, so the pure content builders below can date
 * their objects without every one of them being an effect.
 */
export const clock = SampleSpace.makeClock(REFERENCE);

export const daysAgo = clock.daysAgo;

export const daysFromNow = clock.daysFromNow;

export const textBlock = (text: string): ContentBlock.Text => ({ _tag: 'text', text }) satisfies ContentBlock.Text;

export const actor = (name: string, email: string): Actor.Actor => ({ role: 'user', name, email });

// Strip any run of leading reply/forward prefixes ("Re:", "Fwd:") so replies share their root's
// thread key. Case-insensitive; collapses surrounding whitespace.
const normalizeSubject = (subject: string): string => subject.replace(/^(\s*(re|fwd?):\s*)+/i, '').trim();

// Deterministic, human-readable thread id from a normalized subject — keeps the 1-line JSON diff
// legible on regeneration (Gmail uses opaque hex ids; any stable string works for grouping).
const threadSlug = (normalizedSubject: string): string =>
  // NFKD splits accented letters into base + combining mark; the non-alphanumeric replace then drops
  // the marks, so "Fotos del beneficio" and "Café" slugify cleanly without a separate diacritics pass.
  normalizedSubject
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'thread';

// Thread by normalized subject: a message's `threadId` is a deterministic slug of its subject (with
// any "Re:" prefix stripped), so replies land in their root's thread. The mailbox conversation list
// groups on the top-level `threadId`; it's mirrored into `properties.threadId` to match the shape
// synced (Gmail/JMAP) mail carries.
export const threadIdFor = (subject: string): string => `thread-${threadSlug(normalizeSubject(subject))}`;
