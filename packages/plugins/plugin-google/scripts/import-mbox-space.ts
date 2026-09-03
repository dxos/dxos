//
// Copyright 2026 DXOS.org
//

/**
 * Imports a Gmail Takeout `.mbox` file into an ECHO space export (`.dx.json`), out of band.
 *
 * File in → file out: no live client or space is contacted. `SampleSpace` builds a space containing
 * a Mailbox whose append-only feed holds one Message per email, then exports it to a single JSON
 * archive. Drop the archive into Composer (it imports via `client.spaces.import(...)`) to get the
 * mailbox as real, synced data.
 *
 * Usage:
 *   vite-node ./scripts/import-mbox-space.ts -- --in <takeout.mbox> [--out <space.dx.json>]
 *     [--name Inbox] [--limit <count>]
 *
 * With no `--in`, the bundled synthetic fixture (`scripts/fixtures/sample.mbox`) is used so the tool
 * is runnable out of the box.
 *
 * The mbox file is streamed rather than read into memory (real Takeout exports can be several GB —
 * too large for a single JS string) and messages are parsed/appended in bounded batches. `--limit`
 * caps how many messages are imported — useful to validate against a huge real export before
 * committing to a full run, since the final JSON archive is one in-memory string and a truly huge
 * mailbox risks exceeding `buffer.constants.MAX_STRING_LENGTH` on export.
 */

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { buildArchive } from '@dxos/app-toolkit/testing';
import { Database, Feed, Tag } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { mapMboxMessage, streamMboxMessages } from './mbox.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_IN = resolve(__dirname, 'fixtures/sample.mbox');

// Messages parsed and appended per batch, bounding how much raw/parsed data is held at once.
const BATCH_SIZE = 200;

type Options = { in: string; out: string; name: string; limit?: number };

const parseArgs = (argv: string[]): Options => {
  const options = new Map<string, string>();
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg.startsWith('--')) {
      options.set(arg.slice(2), argv[++index] ?? '');
    }
  }
  const input = options.get('in') ?? DEFAULT_IN;
  const out = options.get('out') ?? input.replace(/\.mbox$/i, '') + '.dx.json';
  const name = options.get('name') ?? 'Inbox';
  const limitRaw = options.get('limit');
  const limit = limitRaw === undefined ? undefined : Number(limitRaw);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
    throw new Error(`--limit must be a non-negative integer, got "${limitRaw}"`);
  }
  return { in: input, out, name, limit };
};

export type ImportResult = { imported: number; skipped: number };

/**
 * Builds the Mailbox, then streams the mbox file, appending parsed messages in bounded batches.
 *
 * This is the one phase that appends to its feed eagerly rather than through `SampleSpace.Feeds`:
 * queuing every message until the end of the build would hold a multi-GB mailbox in memory, which
 * is the whole thing the streaming import exists to avoid. It therefore owns the single flush that
 * gives the feed and tag index their DXNs.
 */
const MboxMailbox = (options: Options): SampleSpace.Phase<ImportResult> =>
  SampleSpace.phase('mailbox', {
    schemas: [Feed.Feed, Message.Message, Mailbox.Mailbox, TagIndex.TagIndex, Tag.Tag],
    run: () =>
      Effect.gen(function* () {
        const mailbox = yield* Database.add(Mailbox.make({ name: options.name }));
        const feed = yield* Effect.promise(() => mailbox.feed?.tryLoad());
        if (!feed) {
          return yield* Effect.fail(new SampleSpace.SampleSpaceError({ context: { reason: 'mailbox-feed-missing' } }));
        }
        // Feed objects need DXNs before append, and the tag index must be resolvable before tagging.
        yield* Database.flush();

        let imported = 0;
        let skipped = 0;

        // `--limit` takes effect before grouping, so it caps messages exactly rather than rounding
        // up to the next batch as a read-then-break loop would.
        const messages = Stream.fromAsyncIterable(
          streamMboxMessages(options.in),
          (error) => new SampleSpace.SampleSpaceError({ context: { reason: 'mbox-read-failed', error } }),
        );
        const batches = (options.limit === undefined ? messages : Stream.take(messages, options.limit)).pipe(
          Stream.grouped(BATCH_SIZE),
        );

        yield* Stream.runForEach(batches, (batch) =>
          Effect.gen(function* () {
            const mapped = (yield* Effect.promise(() => Promise.all(batch.map((raw) => mapMboxMessage(raw))))).filter(
              (result): result is NonNullable<typeof result> => result !== null,
            );
            yield* Database.appendToFeed(
              feed,
              mapped.map(({ message }) => message),
            );
            // `SampleSpace.Tags` resolves each distinct label once — `Tag.findOrCreate` without a
            // foreign key scans every Tag in the space, so resolving per message-label pair turns
            // tagging into the dominant, ever-growing cost over a large import.
            yield* SampleSpace.tagBatch(
              mapped.flatMap(({ message, labels }) => labels.map((label) => ({ object: message, key: label }))),
              { index: mailbox.tags.target },
            );
            imported += mapped.length;
            skipped += batch.length - mapped.length;
            yield* Effect.log(`…${imported} imported, ${skipped} skipped`);
          }),
        );

        return { imported, skipped };
      }),
  });

const mboxSpace = (options: Options) => {
  const phases = { mailbox: MboxMailbox(options) };
  return SampleSpace.make<typeof phases, ImportResult>({
    space: { name: `${basename(options.in)} (mbox)`, icon: 'ph--tray--regular', hue: 'rose' },
    phases,
    build: (phases) => phases.mailbox(),
  });
};

const options = parseArgs(process.argv.slice(2));

await EffectEx.runPromise(
  Effect.gen(function* () {
    yield* Effect.log(`importing ${options.in}${options.limit !== undefined ? ` (limit ${options.limit})` : ''}…`);
    const { result, json } = yield* buildArchive(mboxSpace(options), { identity: 'mbox importer' });

    yield* Effect.promise(() => writeFile(options.out, json + '\n', 'utf8'));
    yield* Effect.log(`wrote ${options.out} — ${result.imported} messages imported, ${result.skipped} skipped`);
  }),
);
