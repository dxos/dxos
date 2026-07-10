//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { type Database, Feed } from '@dxos/echo';
import { Message } from '@dxos/types';

// The private mailbox feed fixture — the payload the MailboxSync story's ArchiveModule "Download
// feed" button produces. Local-development-only, never committed (the package `.gitignore` ignores
// `./fixtures`). Override with `MAILBOX_FEED_FIXTURE`.
export const FIXTURE =
  process.env.MAILBOX_FEED_FIXTURE ??
  fileURLToPath(new URL('../../../fixtures/local/mailbox-feed.json', import.meta.url));

export const fixtureExists = (): boolean => existsSync(FIXTURE);

// Optional cap on messages, for fast iteration (`LIMIT=5 moon run ...`). Undefined → all messages.
export const LIMIT = process.env.LIMIT ? Math.max(0, Number(process.env.LIMIT)) : undefined;

// Reconstructs a message from a serialized fixture entry, minting a fresh id. Retains the fields the
// downstream stages read: sender, timestamp, textual blocks, thread, and properties (subject, to,
// cc, references, snippet). Cross-object refs (`attachments`) are dropped — the referenced objects
// are not in the fixture.
const reconstructMessage = (json: any): Message.Message =>
  Message.make({
    created: json.created,
    sender: json.sender,
    blocks: json.blocks ?? [],
    threadId: json.threadId,
    properties: json.properties,
  });

/**
 * Loads and reconstructs the fixture messages, sorted oldest-first by `created` and capped at
 * `limit` (defaults to the `LIMIT` env). The sort mirrors real mailbox ingestion order: the fact
 * pipeline's high-water cursor advances by timestamp, so an unsorted (e.g. newest-first) feed would
 * skip every message older than the first one processed.
 */
export const loadFixtureMessages = (limit = LIMIT): Message.Message[] => {
  const entries = JSON.parse(readFileSync(FIXTURE, 'utf8')) as unknown[];
  const messages = entries.map(reconstructMessage).sort((a, b) => a.created.localeCompare(b.created));
  return limit !== undefined ? messages.slice(0, limit) : messages;
};

/** Adds a fresh feed seeded with the given messages to the database. */
export const seedFeed = async (db: Database.Database, messages: readonly Message.Message[]): Promise<Feed.Feed> => {
  const feed = db.add(Feed.make({ name: 'mailbox' }));
  await db.appendToFeed(feed, [...messages]);
  await db.flush();
  return feed;
};
