//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { FactStore, type RDF, normalizeEntityId } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { DraftMessage, InboxOperation, Mailbox } from '../types';

const handler: Operation.WithHandler<typeof InboxOperation.GenerateReply> = InboxOperation.GenerateReply.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ mailbox: mailboxRef, message }) {
      const mailbox = yield* Database.load(mailboxRef);
      if (!Mailbox.instanceOf(mailbox) || !Obj.instanceOf(Message.Message, message)) {
        return { subject: '', body: '' };
      }
      return yield* generateReply({ mailbox, message });
    }),
  ),
);

export default handler;

const GENERATE_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

/** Reply subject: prefix once, never stacking `Re:`. */
export const replySubject = (subject: string | undefined): string => {
  const base = (subject ?? '').replace(/^(\s*re:\s*)+/i, '').trim();
  return base.length > 0 ? `Re: ${base}` : 'Re:';
};

const normalizeSubject = (subject: string | undefined): string =>
  (subject ?? '')
    .replace(/^(\s*re:\s*)+/i, '')
    .trim()
    .toLowerCase();

const senderLabel = (message: Message.Message): string | undefined =>
  message.sender.name ?? message.sender.email?.split('@')[0];

const factLine = (fact: RDF.Fact): string => {
  const term = (value: RDF.Term) => ('entity' in value ? (value.label ?? value.entity) : value.literal);
  const { subject, predicate, object } = fact.assertion;
  return `- ${term(subject)} — ${predicate} — ${term(object)} (${fact.factuality.value}, ${fact.recordedAt.slice(0, 10)})`;
};

const generatePrompt = (options: { thread: string; facts: string; sender: string }): string => trim`
  Draft a reply to the email thread below, addressed to ${options.sender}.
  ${options.facts.length > 0 ? 'Use the known facts where relevant, hedging non-certain ones (factuality codes: CT certain, PR probable, PS possible; trailing "-" means negated).' : ''}
  Match the tone of the thread, be concise, and answer any questions the last message asks.
  Do not invent commitments or information that is not grounded in the thread or the facts.
  Respond with ONLY the reply body text — no subject line, no salutation placeholders like [Name].

  ${options.facts.length > 0 ? `Known facts about the participants:\n${options.facts}\n` : ''}
  Thread (oldest first):
  ${options.thread}
`;

/**
 * Drafts a grounded reply: gathers the message's thread (same normalized subject) from the mailbox
 * feed, looks up facts about the participants in the space fact store, and prompts the LLM for a
 * reply body. Accepts either the message to reply to or a reply draft (resolved via `inReplyTo`).
 * Fact lookup degrades to none on store failure — a reply can always be drafted; LLM failure is a
 * defect (a broken model configuration should surface loudly). Named export so the flow is
 * unit-testable without the operation runtime.
 */
export const generateReply = (options: {
  readonly mailbox: Mailbox.Mailbox;
  readonly message: Message.Message;
}): Effect.Effect<
  { subject: string; body: string },
  never,
  FactStore | AiService.AiService | Database.Service
> =>
  Effect.gen(function* () {
    const { mailbox } = options;

    const feed = yield* Database.load(mailbox.feed).pipe(Effect.orDie);
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run.pipe(
      Effect.orElseSucceed((): Message.Message[] => []),
    );

    // A draft reply resolves to the feed message it replies to (via its threading header); a feed
    // message is the reply target itself.
    const message = DraftMessage.instanceOf(options.message)
      ? messages.find(
          (candidate) =>
            candidate.properties?.messageId !== undefined &&
            candidate.properties.messageId === options.message.properties?.inReplyTo,
        )
      : options.message;
    if (!message) {
      return { subject: replySubject(options.message.properties?.subject), body: '' };
    }

    // Thread context: feed messages sharing the normalized subject, oldest first, bounded.
    const subjectKey = normalizeSubject(message.properties?.subject);
    const thread = messages
      .filter((candidate) => normalizeSubject(candidate.properties?.subject) === subjectKey)
      .sort((left, right) => Date.parse(left.created) - Date.parse(right.created))
      .slice(-InboxOperation.DEFAULT_GENERATE_REPLY_THREAD_LIMIT);
    const threadText = (thread.length > 0 ? thread : [message])
      .map((entry) => `From: ${entry.sender.name ?? entry.sender.email ?? 'unknown'}\n${Message.extractText(entry)}`)
      .join('\n---\n');

    // Facts about the participants (sender + thread senders), deduped, bounded. Advisory: a failing
    // store must not block drafting.
    const store = yield* FactStore;
    const participants = [
      ...new Set([senderLabel(message), ...thread.map(senderLabel)].filter((label) => label !== undefined)),
    ];
    const factsById = new Map<string, RDF.Fact>();
    for (const participant of participants) {
      const facts = yield* store
        .query({ entity: normalizeEntityId(participant) })
        .pipe(Effect.orElseSucceed((): RDF.Fact[] => []));
      for (const fact of facts) {
        factsById.set(fact.id, fact);
      }
    }
    const facts = [...factsById.values()].slice(0, InboxOperation.DEFAULT_GENERATE_REPLY_FACT_LIMIT);

    const prompt = generatePrompt({
      thread: threadText,
      facts: facts.map(factLine).join('\n'),
      sender: message.sender.name ?? message.sender.email ?? 'the sender',
    });
    const body = yield* LanguageModel.generateText({ prompt }).pipe(
      Effect.provide(AiService.model(GENERATE_MODEL).pipe(Layer.orDie)),
      Effect.timeout('30 seconds'),
      Effect.map((response) => response.text),
      Effect.orDie,
    );

    return { subject: replySubject(message.properties?.subject), body };
  });
