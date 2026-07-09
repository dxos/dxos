//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';

import { random } from '@dxos/random';

import { JmapMail } from '../apis';
import { type JmapDataset } from '../services';

export interface GenerateJmapDatasetOptions {
  /** Number of emails to generate. */
  count?: number;
  /** Distinct conversation threads to spread emails across. Defaults to ~count/3. */
  threads?: number;
  /** Distinct senders. Defaults to ~count/5. */
  senders?: number;
  /** Custom (user) folder names, in addition to the always-present system folders. */
  folders?: readonly string[];
  /** Seed for deterministic output (same seed → same dataset). */
  seed?: number;
  /** `receivedAt` window. Defaults to [now − 90 days, now]. */
  start?: Date;
  end?: Date;
  /** Prefix for email + thread ids, so disjoint datasets (e.g. date bands) don't collide. Defaults to `eml`. */
  idPrefix?: string;
}

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';
const ACCOUNT_ID = 'test-account';
const INBOX_ID = 'mb-inbox';

/** System folders every JMAP account has; the sync excludes trash/junk/drafts from the default scope. */
const SYSTEM_FOLDERS: readonly JmapMail.Mailbox[] = [
  { id: INBOX_ID, name: 'Inbox', role: 'inbox' },
  { id: 'mb-sent', name: 'Sent', role: 'sent' },
  { id: 'mb-drafts', name: 'Drafts', role: 'drafts' },
  { id: 'mb-trash', name: 'Trash', role: 'trash' },
  { id: 'mb-junk', name: 'Junk', role: 'junk' },
];

/** The session a {@link JmapMailApi.mock} serves — a single mail account discovered at `apiUrl`. */
const SESSION = {
  apiUrl: 'https://jmap.test/api/',
  username: 'test@jmap.test',
  primaryAccounts: { [MAIL_ACCOUNT_CAPABILITY]: ACCOUNT_ID },
};

/**
 * Deterministically generates a {@link JmapDataset} for driving {@link JmapMailApi.mock} in unit
 * tests — no live account. Emails are ordered ascending by `receivedAt` and spread across the
 * [start, end] window (all in the Inbox) so the sync's window walk + pagination exercise realistically.
 * Mirrors `generateGmailDataset`.
 */
export const generateJmapDataset = (options: GenerateJmapDatasetOptions = {}): JmapDataset => {
  const count = options.count ?? 100;
  const threadCount = Math.max(1, options.threads ?? Math.ceil(count / 3));
  const senderCount = Math.max(1, options.senders ?? Math.ceil(count / 5));
  const end = options.end ?? new Date();
  const start = options.start ?? subDays(end, 90);
  const idPrefix = options.idPrefix ?? 'eml';
  random.seed(options.seed ?? 42);

  const customFolders: JmapMail.Mailbox[] = (options.folders ?? ['Work', 'Personal']).map((name, index) => ({
    id: `mb-custom-${index + 1}`,
    name,
    role: null,
  }));
  const folders = [...SYSTEM_FOLDERS, ...customFolders];

  const senders = Array.from({ length: senderCount }, () => ({
    name: random.person.fullName(),
    email: random.internet.email(),
  }));
  const threadIds = Array.from({ length: threadCount }, (_, index) => `${idPrefix}-thread-${index}`);

  const startMs = start.getTime();
  const endMs = end.getTime();

  const emails: JmapMail.Email[] = Array.from({ length: count }, (_, index) => {
    const sender = random.helpers.arrayElement(senders);
    const threadId = random.helpers.arrayElement(threadIds);
    // Monotonic ascending across the window (the mock relies on ascending receivedAt).
    const receivedAtMs = Math.round(startMs + ((endMs - startMs) * index) / Math.max(1, count));
    const subject = random.lorem.sentence();
    const body = random.lorem.paragraph();

    return {
      id: `${idPrefix}-${index}`,
      threadId,
      mailboxIds: { [INBOX_ID]: true },
      from: [{ name: sender.name, email: sender.email }],
      to: [{ email: 'me@jmap.test' }],
      subject,
      receivedAt: new Date(receivedAtMs).toISOString(),
      preview: body.slice(0, 100),
      bodyValues: { body: { value: body } },
      textBody: [{ partId: 'body', type: 'text/plain' }],
    };
  });

  return { session: SESSION, folders, emails };
};
