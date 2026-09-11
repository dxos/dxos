//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { AiService } from '@dxos/ai';
import { PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { normalizeEmail } from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Message, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import * as InboxOperation from '../../types/InboxOperation.ts';
import * as Mailbox from '../../types/Mailbox.ts';
import { isAiUnavailableCause } from '../extractor/ai-gate.ts';
import { withMailboxLock } from '../mailbox-lock.ts';

const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

const SUMMARY_PROMPT = trim`
  Summarize this email conversation in one or two plain sentences for someone triaging their inbox:
  where the exchange stands now, and any action or deadline it leaves open. Cover the whole thread
  rather than only its latest message, and prefer the most recent state when messages disagree. No
  preamble, no greeting, no bullet points — just the summary.
`;

/** Per-message body cap in a thread transcript, so a long exchange still fits one prompt. */
const MAX_MESSAGE_CHARS = 2_000;

/** Whole-transcript cap; the OLDEST messages are dropped first, since recency carries the state. */
const MAX_TRANSCRIPT_CHARS = 12_000;

/** `Message.properties` is an open record, so its values are narrowed rather than asserted. */
const stringProperty = (message: Message.Message, key: string): string | undefined => {
  const value = message.properties?.[key];
  return typeof value === 'string' ? value : undefined;
};

/** The body text handed to the model; snippets are short, so the text blocks are preferred. */
const messageText = (message: Message.Message): string => {
  const body = message.blocks
    .filter((block) => block._tag === 'text')
    .map((block) => block.text)
    .join('\n\n');
  const text = body.length > 0 ? body : (stringProperty(message, 'snippet') ?? '');
  return text.slice(0, MAX_MESSAGE_CHARS);
};

const senderLabel = (message: Message.Message): string =>
  message.sender?.name
    ? `${message.sender.name} <${message.sender.email ?? ''}>`
    : (message.sender?.email ?? 'unknown');

/**
 * The conversation as a transcript, oldest to newest. Trimmed from the FRONT when it exceeds the
 * budget: a summary is about where the exchange now stands, so the newest messages are the ones that
 * must survive.
 */
const transcriptFor = (thread: readonly Message.Message[]): string => {
  const entries: string[] = [];
  let budget = MAX_TRANSCRIPT_CHARS;
  for (const message of [...thread].reverse()) {
    const entry = `FROM: ${senderLabel(message)}\nDATE: ${message.created}\n\n${messageText(message)}`;
    if (entry.length > budget) {
      // The newest message alone can exceed the budget (a long body, a long sender list): keep its
      // head rather than dropping it, so the transcript still honours the cap.
      if (entries.length === 0) {
        entries.unshift(entry.slice(0, budget));
      }
      break;
    }
    entries.unshift(entry);
    budget -= entry.length;
  }
  return entries.join('\n\n---\n\n');
};

export const promptFor = (thread: readonly Message.Message[]): string => {
  const subject = thread.map((message) => stringProperty(message, 'subject')).find(Boolean) ?? '(none)';
  const count = thread.length;
  return `${SUMMARY_PROMPT}\n\nSUBJECT: ${subject}\nMESSAGES: ${count}\n\n${transcriptFor(thread)}`;
};

/**
 * The conversations to summarize, oldest message first within each, newest thread last.
 *
 * Threads are the unit of work: summarizing each message alone re-answers the same question once per
 * reply and never states where the exchange stands. A message with no `threadId` is its own
 * conversation (the feed's `null` group is not one thread).
 */
export const groupThreads = (messages: readonly Message.Message[]): Message.Message[][] => {
  const byThread = new Map<string, Message.Message[]>();
  for (const message of messages) {
    const key = message.threadId ?? `message:${message.id}`;
    const thread = byThread.get(key);
    if (thread) {
      thread.push(message);
    } else {
      byThread.set(key, [message]);
    }
  }
  for (const thread of byThread.values()) {
    thread.sort((left, right) => Date.parse(left.created) - Date.parse(right.created));
  }
  return [...byThread.values()];
};

/** The message a thread's summary is filed under: its newest, so a later reply invalidates it. */
export const threadSubject = (thread: readonly Message.Message[]): Message.Message => thread[thread.length - 1];

/** The pipeline body; the handler runs it under the mailbox lock. */
const summarize = Effect.fnUntraced(function* (
  mailbox: Mailbox.Mailbox,
  { batchLimit, contactsOnly = true, model }: { batchLimit?: number; contactsOnly?: boolean; model?: string },
) {
  const limit = Math.min(
    batchLimit ?? InboxOperation.DEFAULT_SUMMARIZE_MAILBOX_BATCH_LIMIT,
    InboxOperation.MAX_SUMMARIZE_MAILBOX_BATCH_LIMIT,
  );

  const feed = yield* Database.load(mailbox.feed);
  const { db } = yield* Database.Service;

  const signal = yield* Cancellation.signal;
  const traceWriter = yield* Trace.TraceService;
  const progressKey = InboxOperation.createSummarizeProgressKey(mailbox);
  let current = 0;
  let total: number | undefined;
  const reportStatus = (patch: { message?: string; current?: number; total?: number } = {}) => {
    current = patch.current ?? current;
    total = patch.total ?? total;
    traceWriter.write(Trace.StatusUpdate, {
      message: patch.message ?? mailbox.name ?? 'Mailbox',
      progress: { key: progressKey, current, total },
    });
  };

  // The gate: senders the space already knows as people.
  const people = yield* Database.query(Filter.type(Person.Person)).run;
  const known = new Set(
    people.flatMap((person) =>
      (person.emails ?? []).map((email) => normalizeEmail(email.value)).filter((email): email is string => !!email),
    ),
  );

  // Already-summarized threads are skipped by their newest message's id rather than by feed
  // position, so a cursor reset never re-bills work whose result is already in the feed — and a
  // thread that has since GROWN is summarized again, because its newest message is a new subject.
  const annotations = mailbox.annotations?.target;
  const existing = annotations ? yield* Feed.query(annotations, Filter.type(Message.Message)).run : [];
  const summarized = new Set(existing.map((annotation) => annotation.parentMessage).filter(Boolean));

  const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
  // The gate is applied per MESSAGE but qualifies the whole thread: one known correspondent in an
  // exchange makes the exchange worth summarizing, whoever else is on it.
  const isKnown = (message: Message.Message): boolean => {
    if (!contactsOnly) {
      return true;
    }
    const sender = normalizeEmail(message.sender?.email);
    return !!sender && known.has(sender);
  };
  const candidates = groupThreads(messages).filter(
    (thread) => thread.some(isKnown) && !summarized.has(threadSubject(thread).id),
  );
  const batch = candidates.slice(0, limit);
  const remaining = candidates.length - batch.length;

  log.info('summarize: pipeline start', {
    mailbox: Obj.getURI(mailbox),
    messages: messages.length,
    knownSenders: known.size,
    pending: candidates.length,
    batch: batch.length,
  });
  reportStatus({ current: 0, total: batch.length });

  const modelLayer = AiService.model(model ?? DEFAULT_MODEL).pipe(Layer.orDie);
  let summarized_ = 0;
  for (const thread of batch) {
    if (signal.aborted) {
      break;
    }

    const subject = threadSubject(thread);
    const text = yield* LanguageModel.generateText({ prompt: promptFor(thread) }).pipe(
      Effect.map((response) => response.text.trim()),
      Effect.provide(modelLayer),
      // A summary is advisory: one failed generation skips its thread rather than failing the
      // run and stranding the summaries already appended. An UNAVAILABLE model is different — it
      // fails identically for every thread, so swallowing it would report a successful run that
      // summarized nothing. Let it through for the caller (the cascade) to report as a skip.
      Effect.catchCause((cause) =>
        isAiUnavailableCause(cause)
          ? Effect.failCause(cause)
          : Effect.sync(() => {
              log.warn('summarize: generation failed', {
                message: subject.id,
                messages: thread.length,
                cause: Cause.pretty(cause).slice(0, 200),
              });
              return '';
            }),
      ),
    );
    if (text.length > 0) {
      const target = Mailbox.findOrCreateAnnotations(mailbox, db);
      yield* Feed.append(target, [Mailbox.makeSummary({ message: subject, text, model: model ?? DEFAULT_MODEL })]);
      summarized_ += 1;
    }
    reportStatus({ current: summarized_, message: stringProperty(subject, 'subject') });
  }

  yield* Effect.promise(() => db.flush());
  log.info('summarize: pipeline done', {
    mailbox: Obj.getURI(mailbox),
    summarized: summarized_,
    remaining,
  });
  reportStatus({
    message: summarized_ === 0 && batch.length > 0 ? PROGRESS_STATUS_FAILED : PROGRESS_STATUS_COMPLETE,
  });

  return { pending: candidates.length, summarized: summarized_, remaining };
});

/**
 * Summarizes conversations involving known contacts into the mailbox's annotation feed — one
 * immutable summary Message per THREAD (see `Mailbox.makeSummary`), filed under the thread's newest
 * message and merged back on read by `mergeAnnotations`.
 *
 * The thread, not the message, is the unit: summarizing each message alone re-answers the same
 * question once per reply and can never say where an exchange stands. Filing under the newest message
 * is what makes that safe — a later reply leaves the stored summary describing a message that is no
 * longer the newest, so the next run re-summarizes the thread rather than reporting it done.
 *
 * The contact gate is what keeps the tier affordable: one LLM call per thread, only for exchanges
 * with a sender the space already knows as a Person, hard-capped per run on top of that. Threads
 * whose newest message already carries a summary are skipped, so the operation is idempotent
 * independent of any cursor.
 */
const handler = InboxOperation.SummarizeMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, batchLimit, contactsOnly, model }) {
      const mailbox = yield* Database.load(mailboxRef);
      // Serialized per mailbox: the body reads which messages already carry a summary and then
      // appends more, so an interleaved second run would re-summarize the same messages (and could
      // provision a second annotation feed, orphaning the first).
      return yield* withMailboxLock(mailbox, summarize(mailbox, { batchLimit, contactsOnly, model }));
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
