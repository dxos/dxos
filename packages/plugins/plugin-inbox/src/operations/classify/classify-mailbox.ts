//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { AiService } from '@dxos/ai';
import { PROGRESS_STATUS_CANCELLED, PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { normalizeEmail } from '@dxos/extractor-lib';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { Tagging } from '@dxos/schema';
import { Message, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { InboxOperation } from '#types';

import { type SystemTagId, findOrCreateSystemTag } from '../../types/SystemTags';
import { CLASSIFY_CURSOR_KEY_ID, findOrCreateFeedCursor } from '../FeedCursor';

const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

/** Categories the model may assign — the canonical mail-category system tags. */
const Category = Schema.Literals(['personal', 'social', 'promotions', 'updates', 'forums']);

const ClassificationResult = Schema.Struct({
  index: Schema.Number.annotate({ description: 'The message number from the input list.' }),
  spam: Schema.Boolean.annotate({
    description: 'True only for unsolicited, deceptive, or phishing mail — not routine subscribed bulk mail.',
  }),
  // Nullable: models consistently emit `category: null` for spam entries.
  category: Schema.NullOr(Category).pipe(Schema.optional).annotate({
    description: 'Best-fit category for the message; may be null when spam.',
  }),
});
interface ClassificationResult extends Schema.Schema.Type<typeof ClassificationResult> {}

const ClassificationPayload = Schema.Struct({
  results: Schema.Array(ClassificationResult),
});
interface ClassificationPayload extends Schema.Schema.Type<typeof ClassificationPayload> {}

const decodeResult = Schema.decodeUnknownOption(ClassificationResult);

// Top-level `{…}` spans in free text (best-effort tokenizer for salvage — see `parseExtractPayload`
// in pipeline-rdf, which this mirrors).
const jsonObjectSpans = (raw: string): string[] => {
  const spans: string[] = [];
  let depth = 0;
  let start = -1;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === '{') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
    } else if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        spans.push(raw.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return spans;
};

/** Salvage a {@link ClassificationPayload} from free model text; entries that don't decode are dropped. */
const parseClassification = (raw: string): ClassificationPayload => {
  for (const span of jsonObjectSpans(raw)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(span);
    } catch {
      continue;
    }
    const results = typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, 'results') : undefined;
    if (!Array.isArray(results)) {
      continue;
    }
    return {
      results: results.flatMap((entry) => {
        // Models drift on the index field name (`number`); normalize before decoding.
        const normalized =
          typeof entry === 'object' && entry !== null && !('index' in entry) && 'number' in entry
            ? { ...entry, index: Reflect.get(entry, 'number') }
            : entry;
        return Option.match(decodeResult(normalized), { onNone: () => [], onSome: (result) => [result] });
      }),
    };
  }
  return { results: [] };
};

/**
 * Strict structured output first (strong hosted models honor the schema), then a lenient
 * text + JSON-salvage fallback so a schema-non-conforming model (markdown wrapping, prose) still
 * yields verdicts instead of failing the page — the same split `pipeline-rdf`'s extract stage uses.
 */
const generateClassification = (prompt: string, useStrict: boolean) =>
  Effect.gen(function* () {
    if (useStrict) {
      const strict = yield* LanguageModel.generateObject({ schema: ClassificationPayload, prompt }).pipe(
        Effect.map((response) => Option.some(response.value)),
        Effect.catch(() => Effect.succeed(Option.none<ClassificationPayload>())),
      );
      if (Option.isSome(strict)) {
        return strict.value;
      }
    }
    const response = yield* LanguageModel.generateText({
      prompt: `${prompt}\n\nRespond with ONLY a JSON object of the form {"results": [ ... ]} — no prose, no markdown fences.`,
    });
    const payload = parseClassification(response.text);
    if (useStrict) {
      log.warn('classify: strict rejected, used lenient fallback', { results: payload.results.length });
    }
    return payload;
  });

const CLASSIFY_PROMPT = trim`
  Classify each numbered email message below for a personal mailbox.

  For every message return an entry with its number, a spam verdict, and a category:
  - spam: true ONLY for unsolicited, deceptive, or phishing mail. Routine mail the user plausibly
    subscribed to (newsletters, receipts, service notifications) is NOT spam.
  - category: personal (individual writing to the user), social (social networks / community),
    promotions (marketing / offers), updates (receipts, statements, notifications), forums
    (mailing lists / discussion groups).

  Messages marked [list-mail] carry a List-Unsubscribe header (bulk mail) — that alone does not
  make them spam. Return a result for every message number, as JSON of the exact form:
  {"results": [{"index": <message number>, "spam": <boolean>, "category": <category or null>}, ...]}
`;

/** The first text block's leading characters, as a fallback when the sync mapper recorded no snippet. */
const messageSnippet = (message: Message.Message): string => {
  const snippet = message.properties?.snippet;
  if (typeof snippet === 'string' && snippet.length > 0) {
    return snippet.slice(0, 240);
  }
  const text = message.blocks.find((block) => block._tag === 'text')?.text ?? '';
  return text.slice(0, 240);
};

const promptEntry = (message: Message.Message, index: number): string => {
  const sender = message.sender?.name
    ? `${message.sender.name} <${message.sender.email ?? ''}>`
    : (message.sender?.email ?? 'unknown');
  const bulk = message.properties?.listUnsubscribe ? ' [list-mail]' : '';
  return `#${index} FROM: ${sender}${bulk}\nSUBJECT: ${message.properties?.subject ?? '(none)'}\nSNIPPET: ${messageSnippet(message)}`;
};

/**
 * LLM spam detection and category labeling over the mailbox feed. Cursored like `ProcessMailbox`
 * (own consumer tag), hard-capped at {@link InboxOperation.MAX_CLASSIFY_MAILBOX_BATCH_LIMIT}
 * messages per run so LLM usage stays bounded; each LLM call classifies one page and the cursor
 * advances per page. Senders with a known Person object are short-circuited: tagged `personal`,
 * never spam, and never sent to the model. Labels are the canonical system tags applied through
 * the mailbox's tag index, so reclassification converges (idempotent).
 */
const handler = InboxOperation.ClassifyMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, batchLimit, pageSize, model, strict }) {
      const limit = Math.min(
        batchLimit ?? InboxOperation.DEFAULT_CLASSIFY_MAILBOX_BATCH_LIMIT,
        InboxOperation.MAX_CLASSIFY_MAILBOX_BATCH_LIMIT,
      );
      const page = pageSize ?? InboxOperation.DEFAULT_CLASSIFY_MAILBOX_PAGE_SIZE;

      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const tagIndex = yield* Database.load(mailbox.tags);
      const { db } = yield* Database.Service;
      const cursor = yield* findOrCreateFeedCursor(mailbox, CLASSIFY_CURSOR_KEY_ID);

      const signal = yield* Cancellation.signal;
      const traceWriter = yield* Trace.TraceService;
      const progressKey = InboxOperation.createClassifyProgressKey(mailbox);
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

      // Known-person allowlist: any sender with a Person record is never spam.
      const people = yield* Database.query(Filter.type(Person.Person)).run;
      const known = new Set(
        people.flatMap((person) =>
          (person.emails ?? []).map((email) => normalizeEmail(email.value)).filter((email): email is string => !!email),
        ),
      );

      let cursorKey = Cursor.parseKey(cursor.max);
      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const pending = messages
        .filter((message) => {
          const key = Date.parse(message.created);
          return Number.isFinite(key) && key > cursorKey;
        })
        .sort((left, right) => Date.parse(left.created) - Date.parse(right.created));
      const batch = pending.slice(0, limit);
      const remaining = pending.length - batch.length;

      log.info('classify: pipeline start', {
        mailbox: Obj.getURI(mailbox),
        messages: messages.length,
        pending: pending.length,
        batch: batch.length,
        knownSenders: known.size,
      });
      reportStatus({ current: 0, total: batch.length });

      // Lazily resolved canonical tag URIs (one findOrCreate per category actually used).
      const tagUris = new Map<SystemTagId, string>();
      const tagUriFor = (id: SystemTagId) =>
        Effect.gen(function* () {
          const existing = tagUris.get(id);
          if (existing) {
            return existing;
          }
          const tag = yield* Effect.promise(() => findOrCreateSystemTag(db, id));
          const uri = Obj.getURI(tag).toString();
          tagUris.set(id, uri);
          return uri;
        });

      const applyTag = (message: Message.Message, id: SystemTagId) =>
        Effect.gen(function* () {
          const uri = yield* tagUriFor(id);
          Tagging.set(message, uri, { index: tagIndex });
        });

      let processed = 0;
      let spam = 0;
      let knownCount = 0;

      const classifyPage = (messagesPage: readonly Message.Message[]) =>
        Effect.gen(function* () {
          // Known-person shortcut: resolved locally, never sent to the model.
          const unknown: Message.Message[] = [];
          for (const message of messagesPage) {
            const sender = normalizeEmail(message.sender?.email);
            if (sender && known.has(sender)) {
              yield* applyTag(message, 'personal');
              knownCount += 1;
            } else {
              unknown.push(message);
            }
          }

          if (unknown.length > 0) {
            const prompt = `${CLASSIFY_PROMPT}\n\n${unknown.map(promptEntry).join('\n\n')}`;
            const payload = yield* generateClassification(prompt, strict ?? true).pipe(
              Effect.provide(AiService.model(model ?? DEFAULT_MODEL).pipe(Layer.orDie)),
            );
            for (const result of payload.results) {
              const message = unknown[result.index];
              if (!message) {
                log.warn('classify: result index out of range', { index: result.index, page: unknown.length });
                continue;
              }
              if (result.spam) {
                yield* applyTag(message, 'spam');
                spam += 1;
              } else if (result.category) {
                yield* applyTag(message, result.category);
              }
            }
          }

          processed += messagesPage.length;
          reportStatus({
            current: processed,
            message: messagesPage.at(-1)?.properties?.subject ?? mailbox.name ?? 'Mailbox',
          });
        });

      const pipeline = Stream.fromIterable(batch).pipe(
        Stream.grouped(page),
        // v4's `Stream.grouped` emits a non-empty array, not a `Chunk`.
        Stage.map('classify', (messagesPage: readonly Message.Message[]) =>
          Effect.gen(function* () {
            const list = messagesPage;
            yield* classifyPage(list);
            return list;
          }),
        ),
        Pipeline.run({
          sink: (list: readonly Message.Message[]) =>
            Effect.sync(() => {
              const keys = list.map((message) => Date.parse(message.created));
              if (keys.length === 0) {
                return;
              }
              // Advance per LLM page so a cancelled/failed run never re-bills classified messages.
              cursorKey = Math.max(cursorKey, ...keys);
              Cursor.advance(cursor, Cursor.formatKey(cursorKey));
            }),
        }),
        Pipeline.abortWith(
          signal,
          Effect.sync(() => {
            log.info('classify: pipeline cancelled', { mailbox: Obj.getURI(mailbox), processed });
            reportStatus({ message: PROGRESS_STATUS_CANCELLED });
          }),
        ),
      );

      yield* pipeline.pipe(
        Effect.onError((cause) =>
          Effect.sync(() => {
            if (!Cause.hasInterruptsOnly(cause)) {
              Cursor.recordError(cursor, Cause.pretty(cause).slice(0, 500));
              reportStatus({ message: PROGRESS_STATUS_FAILED });
            }
          }),
        ),
      );

      yield* Effect.promise(() => db.flush());
      log.info('classify: pipeline done', {
        mailbox: Obj.getURI(mailbox),
        processed,
        spam,
        known: knownCount,
        remaining,
      });
      reportStatus({ message: PROGRESS_STATUS_COMPLETE });
      return { processed, spam, known: knownCount, remaining };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
