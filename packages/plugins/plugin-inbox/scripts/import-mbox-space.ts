//
// Copyright 2026 DXOS.org
//

/**
 * Imports a Gmail Takeout `.mbox` file into an ECHO space export (`.dx.json`), out of band.
 *
 * File in → file out: no live client or space is contacted. An ephemeral in-memory client builds a
 * space containing a Mailbox whose append-only feed holds one Message per email, then the space is
 * exported to a single JSON archive. Drop the archive into Composer (it imports via
 * `client.spaces.import(...)`) to get the mailbox as real, synced data.
 *
 * Usage:
 *   vite-node ./scripts/import-mbox-space.ts -- --in <takeout.mbox> [--out <space.dx.json>]
 *     [--name Inbox] [--limit <count>]
 *
 * With no `--in`, the bundled synthetic fixture (`scripts/fixtures/sample.mbox`) is used so the tool
 * is runnable out of the box. Mirrors `plugin-onboarding/scripts/build-exemplar-space.ts`.
 *
 * The mbox file is streamed rather than read into memory (real Takeout exports can be several GB —
 * too large for a single JS string) and messages are parsed/appended in bounded batches. `--limit`
 * caps how many messages are imported — useful to validate against a huge real export before
 * committing to a full run, since the final JSON archive is one in-memory string and a truly huge
 * mailbox risks exceeding `buffer.constants.MAX_STRING_LENGTH` on export.
 */

import { writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Config } from '@dxos/config';
import { Feed, Tag, Type } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { Tagging, TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { mapMboxMessage, streamMboxMessages } from './mbox';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_IN = resolve(__dirname, 'fixtures/sample.mbox');

// Messages parsed and appended per batch, bounding how much raw/parsed data is held at once.
const BATCH_SIZE = 200;

// All ECHO types added to the space. Must be registered on any client that hydrates the snapshot.
const SCHEMAS: Type.AnyEntity[] = [Feed.Feed, Message.Message, Mailbox.Mailbox, TagIndex.TagIndex, Tag.Tag];

const parseArgs = (argv: string[]): { in: string; out: string; name: string; limit?: number } => {
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
  return { in: input, out, name, limit: limitRaw ? Number(limitRaw) : undefined };
};

/** Builds the Mailbox, then streams the mbox file, appending parsed messages in bounded batches. */
const importMbox = async (
  space: Space,
  path: string,
  { name, limit }: { name: string; limit?: number },
): Promise<{ imported: number; skipped: number }> => {
  const mailbox = space.db.add(Mailbox.make({ name }));
  const feed = await mailbox.feed?.tryLoad();
  if (!feed) {
    throw new Error('Mailbox missing backing feed');
  }
  // Feed objects need DXNs before append, and the tag index must be resolvable before tagging.
  await space.db.flush();

  // Resolved once per distinct label (there are only a handful of Gmail labels) rather than once per
  // message: `Tag.findOrCreate` without a foreign key scans every Tag object in the space on each
  // call, so re-running it per message-label pair turns tagging into the dominant, ever-growing cost
  // over a large import.
  const tagUriCache = new Map<string, Promise<string>>();
  const getTagUri = (label: string): Promise<string> => {
    let uri = tagUriCache.get(label);
    if (!uri) {
      uri = Tag.findOrCreate(space.db, { label }).then(Mailbox.tagUri);
      tagUriCache.set(label, uri);
    }
    return uri;
  };

  let imported = 0;
  let skipped = 0;
  let batch: string[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    const mapped = (await Promise.all(batch.map((raw) => mapMboxMessage(raw)))).filter(
      (result): result is NonNullable<typeof result> => result !== null,
    );
    await space.db.appendToFeed(
      feed,
      mapped.map(({ message }) => message),
    );
    for (const { message, labels } of mapped) {
      for (const label of labels) {
        Tagging.set(message, await getTagUri(label), { index: mailbox.tags.target });
      }
    }
    imported += mapped.length;
    skipped += batch.length - mapped.length;
    batch = [];
    console.log(`  …${imported} imported, ${skipped} skipped`);
  };

  for await (const raw of streamMboxMessages(path)) {
    if (limit !== undefined && imported + batch.length >= limit) {
      break;
    }
    batch.push(raw);
    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }
  await flushBatch();

  return { imported, skipped };
};

const { in: input, out, name, limit } = parseArgs(process.argv.slice(2));

console.log(`booting client…`);
// An explicit empty Config (no `dataRoot`/`sqlitePath`, no `runtime.services.signaling`, no edge url)
// makes `createLocalClientServices` resolve to in-memory SQLite storage and an in-process
// MemorySignalManager/MemoryTransportFactory swarm — nothing is written to disk and no real network
// connection (signaling, WebRTC, edge) is ever attempted.
const testBuilder = new TestBuilder(new Config());
const client = new Client({ services: testBuilder.createLocalClientServices() });
await client.initialize();
try {
  await client.halo.createIdentity({ displayName: 'mbox importer' });
  await client.addTypes(SCHEMAS);

  console.log(`creating space…`);
  const space = await client.spaces.create({
    name: `${basename(input)} (mbox)`,
    icon: 'ph--tray--regular',
    hue: 'rose',
  });
  await space.waitUntilReady();

  console.log(`importing ${input}${limit !== undefined ? ` (limit ${limit})` : ''}…`);
  const { imported, skipped } = await importMbox(space, input, { name, limit });

  console.log(`flushing…`);
  await space.db.flush();

  console.log(`exporting…`);
  const archive = await space.internal.export({ format: SpaceArchive.Format.JSON });
  const parsed = JSON.parse(new TextDecoder().decode(archive.contents));
  await writeFile(out, JSON.stringify(parsed) + '\n', 'utf8');
  console.log(`wrote ${out} — ${imported} messages imported, ${skipped} skipped`);
} finally {
  await client.destroy();
}
