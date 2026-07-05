//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';

import { random } from '@dxos/random';

import { GoogleMail } from '../apis';
import { type GmailDataset } from '../services';

export interface GenerateGmailDatasetOptions {
  /** Number of messages to generate. */
  count?: number;
  /** Distinct conversation threads to spread messages across. Defaults to ~count/3. */
  threads?: number;
  /** Distinct senders. Defaults to ~count/5. */
  senders?: number;
  /** Custom (user) label names; the common system labels are always present. */
  labels?: readonly string[];
  /** Seed for deterministic output (same seed → same dataset). */
  seed?: number;
  /** `internalDate` window. Defaults to [now − 90 days, now]. */
  start?: Date;
  end?: Date;
  /** Prefix for message + thread ids, so disjoint datasets (e.g. date bands) don't collide. Defaults to `msg`. */
  idPrefix?: string;
}

const SYSTEM_LABELS: readonly GoogleMail.Label[] = [
  { id: 'INBOX', type: 'system', name: 'INBOX' },
  { id: 'SENT', type: 'system', name: 'SENT' },
  { id: 'IMPORTANT', type: 'system', name: 'IMPORTANT' },
  { id: 'UNREAD', type: 'system', name: 'UNREAD' },
];

/**
 * Deterministically generates a {@link GmailDataset} for driving {@link GoogleMailApi.mock} in unit
 * and benchmark tests — no live account. Messages are ordered ascending by `internalDate` and spread
 * across the [start, end] window so the sync's date-walk + pagination exercise realistically.
 */
export const generateGmailDataset = (options: GenerateGmailDatasetOptions = {}): GmailDataset => {
  const count = options.count ?? 100;
  const threadCount = Math.max(1, options.threads ?? Math.ceil(count / 3));
  const senderCount = Math.max(1, options.senders ?? Math.ceil(count / 5));
  const end = options.end ?? new Date();
  const start = options.start ?? subDays(end, 90);
  const idPrefix = options.idPrefix ?? 'msg';
  random.seed(options.seed ?? 42);

  const customLabels: GoogleMail.Label[] = (options.labels ?? ['Work', 'Personal', 'Receipts', 'Travel']).map(
    (name, index) => ({ id: `Label_${index + 1}`, type: 'user', name }),
  );
  const labels = [...SYSTEM_LABELS, ...customLabels];

  const senders = Array.from({ length: senderCount }, () => ({
    name: random.person.fullName(),
    email: random.internet.email(),
  }));
  const threadIds = Array.from({ length: threadCount }, (_, index) => `${idPrefix}-thread-${index}`);

  const startMs = start.getTime();
  const endMs = end.getTime();

  const messages: GoogleMail.Message[] = Array.from({ length: count }, (_, index) => {
    const sender = random.helpers.arrayElement(senders);
    const threadId = random.helpers.arrayElement(threadIds);
    // Monotonic ascending across the window (the mock relies on ascending internalDate).
    const internalDate = Math.round(startMs + ((endMs - startMs) * index) / Math.max(1, count));
    const subject = random.lorem.sentence();
    const body = random.lorem.paragraph();
    // One custom label ~half the time, so tag application is exercised without every message sharing all tags.
    const labelIds = ['INBOX', ...(random.number.int({ min: 0, max: 1 }) ? [random.helpers.arrayElement(customLabels).id] : [])];

    return {
      id: `${idPrefix}-${index}`,
      threadId,
      labelIds,
      snippet: body.slice(0, 100),
      internalDate: String(internalDate),
      payload: {
        headers: [
          { name: 'From', value: `${sender.name} <${sender.email}>` },
          { name: 'To', value: 'me@example.com' },
          { name: 'Subject', value: subject },
        ],
        body: { size: body.length, data: Buffer.from(body, 'utf8').toString('base64') },
      },
    };
  });

  return { labels, messages };
};
