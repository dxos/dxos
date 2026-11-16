//
// Copyright 2026 DXOS.org
//

// Loads one or more Discord export directories (and their `members.json`, from `discord-export.ts --members`) into an
// SQLite insights database that the `facts` CLI queries with `sql`:
//
//   pnpm exec tsx src/testing/insights/build.ts --export <dir> [--export <dir>] --db <insights.db>
//
// Tables (rebuilt each run, except `classification` and `product_mention`, which `classify.ts` fills and keeps):
//   message(id, channel, thread, thread_name, author_id, author, ts, text, reply_to, reply_author_id, is_bot)
//   thread(id, channel, name, starter_id, created)
//   member(id, name, roles, staff, expert, former)

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

import { type MemberRecord } from '../discord-export.ts';
import { isExportFile, readExportFile } from '../export-format.ts';

/** Roles the Cloudflare server gives its own people, and the ones it gives recognised community experts. */
const STAFF_ROLES = new Set(['Cloudflare', 'Cloudflare (Server Owner)', 'Cloudflare Community Team']);
const EXPERT_ROLES = new Set(['Cloudflare Dev Expert', 'Community MVP', 'Mods']);
const FORMER_ROLES = new Set(['Former Cloudflare']);

const { values: args } = parseArgs({
  options: {
    export: { type: 'string', multiple: true },
    db: { type: 'string' },
  },
});

if (!args.export?.length || !args.db) {
  console.error('Usage: build.ts --export <dir> [--export <dir>] --db <insights.db>');
  process.exit(1);
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS message (
  id TEXT PRIMARY KEY, channel TEXT NOT NULL, thread TEXT, thread_name TEXT, author_id TEXT NOT NULL, author TEXT,
  ts TEXT NOT NULL, text TEXT NOT NULL, reply_to TEXT, reply_author_id TEXT, is_bot INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS thread (id TEXT PRIMARY KEY, channel TEXT NOT NULL, name TEXT, starter_id TEXT, created TEXT);
CREATE TABLE IF NOT EXISTS member (
  id TEXT PRIMARY KEY, name TEXT, roles TEXT, staff INTEGER NOT NULL, expert INTEGER NOT NULL, former INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS classification (
  message_id TEXT PRIMARY KEY, kind TEXT, sentiment REAL, topic TEXT, model TEXT
);
CREATE TABLE IF NOT EXISTS product_mention (message_id TEXT NOT NULL, product TEXT NOT NULL, sentiment REAL,
  PRIMARY KEY (message_id, product));
CREATE INDEX IF NOT EXISTS message_author ON message (author_id);
CREATE INDEX IF NOT EXISTS message_thread ON message (thread);
`;

const db = new DatabaseSync(args.db);
db.exec(SCHEMA);
db.exec('DELETE FROM message; DELETE FROM thread; DELETE FROM member;');

const insertMessage = db.prepare('INSERT OR REPLACE INTO message VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertThread = db.prepare('INSERT OR REPLACE INTO thread VALUES (?, ?, ?, ?, ?)');
const insertMember = db.prepare('INSERT OR REPLACE INTO member VALUES (?, ?, ?, ?, ?, ?)');

let messages = 0;
const authorOf = new Map<string, string>();
const pendingReplies: Array<{ readonly id: string; readonly replyTo: string }> = [];
for (const dir of args.export) {
  for (const name of readdirSync(dir).filter(isExportFile)) {
    const file = readExportFile(join(dir, name));
    // A thread file names its parent channel as its category; a channel file has none.
    const header = file;
    const isThread = (header.channel.type ?? '').includes('Thread');
    const channel = isThread ? (header.channel.category ?? 'unknown') : (header.channel.name ?? header.channel.id);
    const thread = isThread ? header.channel.id : null;
    const sorted = [...file.messages].sort((left, right) => (BigInt(left.id) < BigInt(right.id) ? -1 : 1));
    if (thread && sorted.length > 0) {
      insertThread.run(thread, channel, header.channel.name ?? null, sorted[0].author.id, sorted[0].timestamp ?? null);
    }
    for (const message of sorted) {
      const text = (message.content ?? '').trim();
      if (text.length === 0) {
        continue;
      }
      authorOf.set(message.id, message.author.id);
      const replyTo = message.reference?.messageId ?? null;
      insertMessage.run(
        message.id,
        channel,
        thread,
        isThread ? (header.channel.name ?? null) : null,
        message.author.id,
        message.author.nickname ?? message.author.name ?? null,
        message.timestamp ?? '',
        text,
        replyTo,
        null,
        message.author.isBot ? 1 : 0,
      );
      if (replyTo) {
        pendingReplies.push({ id: message.id, replyTo });
      }
      messages++;
    }
  }
}

// Replies are resolved after every file is read, since a reply can quote a message from another export file.
const setReplyAuthor = db.prepare('UPDATE message SET reply_author_id = ? WHERE id = ?');
for (const { id, replyTo } of pendingReplies) {
  const author = authorOf.get(replyTo);
  if (author) {
    setReplyAuthor.run(author, id);
  }
}

let members = 0;
for (const dir of args.export) {
  const file = join(dir, 'members.json');
  if (!existsSync(file)) {
    continue;
  }
  const records: Record<string, MemberRecord> = JSON.parse(readFileSync(file, 'utf8'));
  for (const [id, record] of Object.entries(records)) {
    // Role names can carry invisible characters (the staff role is spelled with a zero-width space), so match on the
    // visible name.
    const roles = record.roles.map((role) => role.replace(/[\u200B-\u200D\uFEFF]/g, ''));
    insertMember.run(
      id,
      record.name,
      roles.join(', '),
      roles.some((role) => STAFF_ROLES.has(role)) ? 1 : 0,
      roles.some((role) => EXPERT_ROLES.has(role)) ? 1 : 0,
      roles.some((role) => FORMER_ROLES.has(role)) ? 1 : 0,
    );
    members++;
  }
}

console.log(`${messages} messages, ${pendingReplies.length} replies, ${members} members → ${args.db}`);
db.close();
