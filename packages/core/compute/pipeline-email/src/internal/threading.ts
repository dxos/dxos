//
// Copyright 2026 DXOS.org
//

import { Message } from '@dxos/types';

// Leading reply/forward markers, stripped repeatedly ("Fw: Re:" → "").
const PREFIX = /^\s*(re|fwd?|fw)\s*:\s*/i;

// Canonical subject for threading: drop reply/forward prefixes, collapse internal whitespace,
// lowercase. Two messages with the same normalized subject belong to the same thread.
export const normalizeSubject = (subject: string): string => {
  let value = subject;
  while (PREFIX.test(value)) {
    value = value.replace(PREFIX, '');
  }
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
};

// Derive a thread id from the subject. The Enron dataset carries no References/In-Reply-To headers,
// so the normalized subject is the available grouping signal; blank subjects share a `no-subject`
// bucket rather than each forming a singleton thread.
export const deriveThreadId = (message: Message.Message): string => {
  const subject = message.properties?.subject;
  const normalized = typeof subject === 'string' ? normalizeSubject(subject) : '';
  return normalized.length > 0 ? normalized : 'no-subject';
};
