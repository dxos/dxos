//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { fixtureExists, fixturePath, fixtureVersions, readFixture } from '@dxos/fixtures';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { Mailbox } from '@dxos/plugin-inbox';
import { TagIndex } from '@dxos/schema';
import { ContentBlock, Message } from '@dxos/types';

/**
 * Smallest possible pipeline over a real captured mailbox: load the archive, seed a Mailbox feed
 * with it, and count what comes back out.
 *
 * Run this first after `moon run fixtures:pull -- mailbox`. It answers "did the corpus survive
 * capture, transfer and ingestion" before any real pipeline runs against it — otherwise a wrong
 * result is ambiguous between a broken fixture and a broken pipeline.
 *
 * Skipped wherever the fixture is absent, which includes all of CI: a suite depending on a private
 * corpus must never be able to fail the build. `moon run fixtures:info` shows what is available.
 */
const FIXTURE = process.env.DX_FIXTURE_NAME ?? 'mailbox';

/** The fields the mail pipelines read off a serialized message. */
type ArchivedMessage = {
  created?: string;
  sender?: { email?: string; name?: string };
  blocks?: { _tag?: string; text?: string; mimeType?: string }[];
  threadId?: string;
  properties?: Record<string, unknown>;
};

describe.skipIf(!fixtureExists(FIXTURE))(`mailbox fixture: "${FIXTURE}"`, () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  test('every archived message lands in the mailbox feed', async ({ expect, onTestFinished }) => {
    onTestFinished(() => void builder.close());

    const archived = readFixture<ArchivedMessage>(FIXTURE);
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Mailbox.Mailbox, TagIndex.TagIndex, Message.Message],
    });

    const mailbox = db.add(Mailbox.make({ name: 'Fixture' }));
    await db.flush();
    const feed = mailbox.feed.target!;
    await db.appendToFeed(feed, archived.map(reconstruct));
    await db.flush({ indexes: true });
    const messages = await EffectEx.runPromise(
      Feed.query(feed, Filter.type(Message.Message)).run.pipe(Effect.provide(Database.layer(db))),
    );

    // Test pipeline.
    const senders = new Set<string>();
    const dates: string[] = [];
    const counted: Message.Message[] = [];
    await EffectEx.runPromise(
      Stream.fromIterable(messages).pipe(
        Stage.map('senders', (message: Message.Message) =>
          Effect.sync(() => {
            const sender = message.sender?.email?.toLowerCase();
            if (sender) {
              senders.add(sender);
            }

            return message;
          }),
        ),
        Stage.map('dates', (message: Message.Message) =>
          Effect.sync(() => {
            dates.push(message.created);
            return message;
          }),
        ),
        Pipeline.run({
          sink: (message) => Effect.sync(() => void counted.push(message)),
        }),
      ),
    );

    dates.sort();

    log.info('mailbox', {
      fixture: fixturePath(FIXTURE),
      versions: fixtureVersions(FIXTURE),
      messages: counted.length,
      senders: senders.size,
      range: {
        from: dates.at(0),
        to: dates.at(-1),
      },
    });

    // The count is the assertion: ingestion must neither drop nor duplicate, and every message the
    // feed holds must reach the sink. Everything else about a real corpus varies between captures,
    // so nothing else is asserted by magnitude.
    expect(messages).toHaveLength(archived.length);
    expect(counted).toHaveLength(archived.length);
    expect(senders.size).toBeGreaterThan(0);

    // Fields a capture can silently lose; absent, extraction later yields nothing for no visible
    // reason, so it is worth failing here where the cause is unambiguous.
    expect(messages.every((message) => Boolean(message.created))).toBe(true);
    expect(messages.some((message) => message.blocks.some((block) => block._tag === 'text'))).toBe(true);
  });
});

/**
 * Rebuilds a feed message from its serialized form, minting a fresh id so an archive can be ingested
 * into the space it came from without colliding. Cross-object refs (`attachments`) are dropped —
 * they would dangle against objects the archive does not carry.
 */
const reconstruct = (archived: ArchivedMessage): Message.Message =>
  Message.make({
    created: archived.created,
    sender: archived.sender ?? {},
    blocks: (archived.blocks ?? [])
      .filter((block) => block._tag === 'text')
      .map((block) => ContentBlock.Text.make({ text: block.text ?? '', mimeType: block.mimeType })),
    threadId: archived.threadId,
    properties: archived.properties,
  });
