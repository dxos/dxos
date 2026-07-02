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
 *   vite-node ./scripts/import-mbox-space.ts -- --in <takeout.mbox> [--out <space.dx.json>] [--name Inbox]
 *
 * With no `--in`, the bundled synthetic fixture (`scripts/fixtures/sample.mbox`) is used so the tool
 * is runnable out of the box. Mirrors `plugin-onboarding/scripts/build-exemplar-space.ts`.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Feed, Tag, Type } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { mapMboxMessage, splitMbox } from './mbox';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_IN = resolve(__dirname, 'fixtures/sample.mbox');

// All ECHO types added to the space. Must be registered on any client that hydrates the snapshot.
const SCHEMAS: Type.AnyEntity[] = [Feed.Feed, Message.Message, Mailbox.Mailbox, TagIndex.TagIndex, Tag.Tag];

const parseArgs = (argv: string[]): { in: string; out: string; name: string } => {
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
  return { in: input, out, name };
};

/** Builds the Mailbox, appends parsed messages to its feed, and applies Gmail labels as tags. */
const importMbox = async (space: Space, raw: string, name: string): Promise<{ imported: number; skipped: number }> => {
  const rawMessages = splitMbox(raw);
  const mapped = (await Promise.all(rawMessages.map((message) => mapMboxMessage(message)))).filter(
    (result): result is NonNullable<typeof result> => result !== null,
  );

  const mailbox = space.db.add(Mailbox.make({ name }));
  const feed = await mailbox.feed?.tryLoad();
  if (!feed) {
    throw new Error('Mailbox missing backing feed');
  }

  // Feed objects need DXNs before append, and the tag index must be resolvable before tagging.
  await space.db.flush();
  await space.db.appendToFeed(
    feed,
    mapped.map(({ message }) => message),
  );

  for (const { message, labels } of mapped) {
    for (const label of labels) {
      await Mailbox.applyTag(mailbox, { label }, message, space.db);
    }
  }

  return { imported: mapped.length, skipped: rawMessages.length - mapped.length };
};

const { in: input, out, name } = parseArgs(process.argv.slice(2));
const raw = await readFile(input, 'utf8');

console.log(`booting client…`);
const testBuilder = new TestBuilder();
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

  console.log(`importing ${input}…`);
  const { imported, skipped } = await importMbox(space, raw, name);

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
