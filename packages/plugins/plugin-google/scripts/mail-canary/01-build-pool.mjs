#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Step 01: turns Enron custodians' maildirs into the canary's pool mbox.
//
//   node scripts/mail-canary/01-build-pool.mjs --maildir ~/enron/maildir --out ~/enron/enron-pool.mbox
//   node scripts/mail-canary/01-build-pool.mjs --maildir ~/enron/maildir --out ~/enron/trial.mbox --limit 10
//
// Samples `--limit` distinct messages evenly over the custodians' history and moves their dates into
// `--span-days` ending `--end-days-ago` days back: inside the sync's 30-day window, so the canary
// space syncs the whole pool.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { readHeader, rewriteHeaders } from '../../src/canary/gmail/index.ts';
import { joinMbox } from '../../src/canary/pool/index.ts';

const DAY = 86_400_000;
// Enron dates outside the corpus's years are corrupt (1979, 2044, ...); clamp them rather than drop the mail.
const EARLIEST = Date.UTC(1998, 0, 1);
const LATEST = Date.UTC(2002, 11, 31);

const { values: args } = parseArgs({
  options: {
    'maildir': { type: 'string' },
    'out': { type: 'string' },
    // One custodian files the same mail under several folders (kean-s: 25,351 files, 6,212 distinct).
    'custodian': { type: 'string', multiple: true, default: ['kean-s', 'dasovich-j', 'kaminski-v'] },
    'limit': { type: 'string', default: '1000' },
    // Ends a day back and spans 28 days, so a pool imported a day after it was built is still inside the window.
    'span-days': { type: 'string', default: '28' },
    'end-days-ago': { type: 'string', default: '1' },
  },
});
if (!args.maildir || !args.out) {
  console.error('usage: 01-build-pool.mjs --maildir <maildir> --out <mbox> [--limit 1000] [--custodian kean-s ...]');
  process.exit(1);
}

/** Content key → the first file with that message and its date. */
const distinct = new Map();
for (const custodian of args.custodian) {
  const files = readdirSync(join(args.maildir, custodian), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
  for (const path of files) {
    const message = readFileSync(path, 'latin1');
    const split = message.search(/\r?\n\r?\n/);
    const body = split === -1 ? '' : message.slice(split).trim();
    // The Gmail mapper drops a message with no body, so its copy would never sync.
    if (!body) {
      continue;
    }
    // The CMU release gives every file its own Message-ID, so a duplicate is known only by its content.
    const key = createHash('sha256')
      .update(
        [readHeader(message, 'From'), readHeader(message, 'Date'), readHeader(message, 'Subject'), body].join('\0'),
      )
      .digest('hex');
    if (!distinct.has(key)) {
      const date = Date.parse(readHeader(message, 'Date') ?? '');
      distinct.set(key, { path, date: Math.min(Math.max(date || EARLIEST, EARLIEST), LATEST) });
    }
  }
}

// An even sample over time, so the pool keeps the whole history rather than one folder or one month.
const sorted = [...distinct.values()].sort((left, right) => left.date - right.date);
const count = Math.min(Number(args.limit) || sorted.length, sorted.length);
const pool = Array.from({ length: count }, (_, index) => sorted[Math.floor((index * sorted.length) / count)]);

const end = Date.now() - Number(args['end-days-ago']) * DAY;
const first = pool[0].date;
const last = pool[pool.length - 1].date;
const scale = (Number(args['span-days']) * DAY) / (last - first || 1);
const messages = pool.map(({ path, date }) =>
  rewriteHeaders(readFileSync(path, 'latin1'), {
    // Bcc would name recipients the original sender hid; it serves no test.
    drop: ['Date', 'Bcc'],
    add: [`Date: ${new Date(end - (last - date) * scale).toUTCString().replace('GMT', '+0000')}`],
  }),
);
writeFileSync(args.out, joinMbox(messages), 'latin1');
console.log(`wrote ${messages.length} of ${distinct.size} distinct messages to ${args.out}`);
