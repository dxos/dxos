//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

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

import * as InboxOperation from '../../types/InboxOperation';
import * as Mailbox from '../../types/Mailbox';
import { isAiUnavailableCause } from '../extractor/ai-gate';
import { withMailboxLock } from '../mailbox-lock';

const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

const SUMMARY_PROMPT = trim`
  Summarize this email in one or two plain sentences for someone triaging their inbox: what the
  sender wants or is telling them, and any action or deadline. No preamble, no greeting, no bullet
  points — just the summary.
`;

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
  return text.slice(0, 4_000);
};

const promptFor = (message: Message.Message): string => {
  const sender = message.sender?.name
    ? `${message.sender.name} <${message.sender.email ?? ''}>`
    : (message.sender?.email ?? 'unknown');
  return `${SUMMARY_PROMPT}\n\nFROM: ${sender}\nSUBJECT: ${stringProperty(message, 'subject') ?? '(none)'}\n\n${messageText(message)}`;
};

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

  // Already-summarized messages are skipped by parent id rather than by feed position, so a
  // cursor reset never re-bills work whose result is already in the feed.
  const annotations = mailbox.annotations?.target;
  const existing = annotations ? yield* Feed.query(annotations, Filter.type(Message.Message)).run : [];
  const summarized = new Set(existing.map((annotation) => annotation.parentMessage).filter(Boolean));

  const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
  const candidates = messages.filter((message) => {
    if (summarized.has(message.id)) {
      return false;
    }
    if (!contactsOnly) {
      return true;
    }
    const sender = normalizeEmail(message.sender?.email);
    return !!sender && known.has(sender);
  });
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
  for (const message of batch) {
    if (signal.aborted) {
      break;
    }

    const text = yield* LanguageModel.generateText({ prompt: promptFor(message) }).pipe(
      Effect.map((response) => response.text.trim()),
      Effect.provide(modelLayer),
      // A summary is advisory: one failed generation skips its message rather than failing the
      // run and stranding the summaries already appended. An UNAVAILABLE model is different — it
      // fails identically for every message, so swallowing it would report a successful run that
      // summarized nothing. Let it through for the caller (the cascade) to report as a skip.
      Effect.catchAllCause((cause) =>
        isAiUnavailableCause(cause)
          ? Effect.failCause(cause)
          : Effect.sync(() => {
              log.warn('summarize: generation failed', {
                message: message.id,
                cause: Cause.pretty(cause).slice(0, 200),
              });
              return '';
            }),
      ),
    );
    if (text.length > 0) {
      const target = Mailbox.findOrCreateAnnotations(mailbox, db);
      yield* Feed.append(target, [Mailbox.makeSummary({ message, text, model: model ?? DEFAULT_MODEL })]);
      summarized_ += 1;
    }
    reportStatus({ current: summarized_, message: stringProperty(message, 'subject') });
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
 * Summarizes mail from known contacts into the mailbox's annotation feed — one immutable summary
 * Message per source message (see `Mailbox.makeSummary`), merged back on read by `mergeAnnotations`.
 *
 * The contact gate is what makes this tier affordable: it costs one LLM call per message, so it runs
 * only over mail from senders that already have a Person record (roughly a sixth of a real mailbox),
 * and is hard-capped per run on top of that. Messages that already carry a summary are skipped, so
 * the operation is idempotent independent of any cursor — re-running only fills gaps, and a
 * re-derivation is an explicit act rather than an accident of a reset.
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
