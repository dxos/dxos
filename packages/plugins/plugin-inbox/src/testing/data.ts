//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Message } from '@dxos/types';

import { Mailbox } from '#types';

import { Builder } from './builder.ts';

/** Fixture tag dictionary — keys are stable across runs so builder can reference them. */
export const LABELS: Record<string, { label: string }> = Object.fromEntries(
  (['important', 'investor', 'team', 'eng', 'work', 'personal'] as const).map((label) => [
    `fixture-tag-${label}`,
    { label },
  ]),
);

/**
 * Initializes a mailbox with linked messages in the given database. `threads` is the size of the
 * thread-id pool messages are randomly assigned to (fewer threads → larger conversations → fewer
 * grouped tiles in conversation view).
 */
export const initializeMailbox = async (db: Database.Database, count = 0, threads = 10): Promise<Mailbox.Mailbox> => {
  const mailbox = db.add(Mailbox.make());
  const feed = await mailbox.feed?.tryLoad();
  if (!feed) {
    throw new Error('Mailbox missing backing feed');
  }

  const { messages } = new Builder().createMessages(count, { links: { db }, threads }).build();
  await EffectEx.runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(db))));
  return mailbox;
};

/**
 * Seeds mock summaries onto the mailbox's annotation feed for a fraction of its messages, so a story
 * can exercise the annotation merge without running the summarization pipeline (or an LLM).
 *
 * Selection is index-based rather than random so a play test can rely on which messages carry one:
 * `ratio` 0.5 summarizes every other message. `ratio` is clamped to `[0, 1]`. Returns how many were
 * written.
 */
export const seedSummaries = async (db: Database.Database, mailbox: Mailbox.Mailbox, ratio = 0.5): Promise<number> => {
  const feed = await mailbox.feed?.tryLoad();
  if (!feed || ratio <= 0) {
    return 0;
  }

  const messages = await EffectEx.runAndForwardErrors(
    Feed.query(feed, Filter.type(Message.Message)).run.pipe(Effect.provide(Database.layer(db))),
  );
  // Cumulative rather than `index % step`: a step rounded from `1 / ratio` collapses every ratio
  // above 0.5 to "all of them" (0.75 would summarize the whole feed).
  const fraction = Math.min(Math.max(Number.isFinite(ratio) ? ratio : 0, 0), 1);
  const targets = messages.filter(
    (_message, index) => Math.floor((index + 1) * fraction) > Math.floor(index * fraction),
  );
  if (targets.length === 0) {
    return 0;
  }

  const annotations = Mailbox.findOrCreateAnnotations(mailbox, db);
  await EffectEx.runAndForwardErrors(
    Feed.append(
      annotations,
      targets.map((message) =>
        Mailbox.makeSummary({
          message,
          text: mockSummary(message),
          model: 'mock',
        }),
      ),
    ).pipe(Effect.provide(Database.layer(db))),
  );

  return targets.length;
};

/** Deterministic stand-in for a generated summary: the sender and subject, phrased like one. */
const mockSummary = (message: Message.Message): string => {
  const sender = message.sender?.name ?? message.sender?.email ?? 'The sender';
  const subject = typeof message.properties?.subject === 'string' ? message.properties.subject : 'this thread';
  return `${sender} writes about ${subject.toLowerCase()}, and is waiting on a reply.`;
};
