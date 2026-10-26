#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Step 01: turns Enron custodians' maildirs into the canary's corpus mbox.
//
//   node scripts/01-build-corpus.mjs --maildir ~/enron/maildir --out ~/enron/enron-corpus.mbox
//   node scripts/01-build-corpus.mjs --maildir ~/enron/maildir --out ~/enron/trial.mbox --limit 10
//
// Samples `--limit` distinct messages evenly over the custodians' history and moves their dates into
// `--span-days` ending `--end-days-ago` days back: older than the sync's 30-day window, which is what
// keeps the canary space from syncing the corpus. Every folder a message was filed in goes into
// `X-Gmail-Labels`, which step 02 turns into Gmail labels.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';

import { FOLDER_HEADER, joinMbox } from '../src/corpus/index.ts';
import { readHeader, rewriteHeaders } from '../src/gmail/index.ts';

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
    'limit': { type: 'string', default: '10000' },
    'span-days': { type: 'string', default: '365' },
    'end-days-ago': { type: 'string', default: '31' },
  },
});
if (!args.maildir || !args.out) {
  console.error('usage: 01-build-corpus.mjs --maildir <maildir> --out <mbox> [--limit 10000] [--custodian kean-s ...]');
  process.exit(1);
}

/** Content key → the first file with that message, its date, and every folder it was filed in. */
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
    const folder = `Enron/${relative(args.maildir, dirname(path)).split(sep).join('/')}`;
    const date = Date.parse(readHeader(message, 'Date') ?? '');
    const entry = distinct.get(key) ?? {
      path,
      date: Math.min(Math.max(date || EARLIEST, EARLIEST), LATEST),
      folders: [],
    };
    entry.folders.push(folder);
    distinct.set(key, entry);
  }
}

// An even sample over time, so the corpus keeps the whole history rather than one folder or one month.
const sorted = [...distinct.values()].sort((left, right) => left.date - right.date);
const count = Math.min(Number(args.limit) || sorted.length, sorted.length);
const corpus = Array.from({ length: count }, (_, index) => sorted[Math.floor((index * sorted.length) / count)]);

const end = Date.now() - Number(args['end-days-ago']) * DAY;
const first = corpus[0].date;
const last = corpus[corpus.length - 1].date;
const scale = (Number(args['span-days']) * DAY) / (last - first || 1);
const messages = corpus.map(({ path, date, folders }) =>
  rewriteHeaders(readFileSync(path, 'latin1'), {
    // Bcc would name recipients the original sender hid; it serves no test.
    drop: ['Date', 'Bcc', FOLDER_HEADER],
    add: [
      `Date: ${new Date(end - (last - date) * scale).toUTCString().replace('GMT', '+0000')}`,
      `${FOLDER_HEADER}: ${[...new Set(folders)].sort().join(',')}`,
    ],
  }),
);
writeFileSync(args.out, joinMbox(messages), 'latin1');
console.log(`wrote ${messages.length} of ${distinct.size} distinct messages to ${args.out}`);
