//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { DecisionModel } from '@dxos/ai-typesafe';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { log } from '@dxos/log';
import { Tagging, TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { LabelerOperation } from '#types';

import { LABELER_TAG_SOURCE, LabelerTag, type LabelerTagId } from '../constants.ts';
import { DEFAULT_MIN_CONFIDENCE, TriageQuestions, labelQuestions, messageState, toVerdict } from '../questions.ts';

/** Finds-or-creates one of this plugin's own tags, keyed so a second run reuses it. */
const findOrCreateLabelerTag = (db: Pick<Database.Database, 'query' | 'add'>, id: LabelerTagId) =>
  Tag.findOrCreate(db, {
    key: { source: LABELER_TAG_SOURCE, id: LabelerTag[id].id },
    label: LabelerTag[id].label,
    hue: LabelerTag[id].hue,
  });

/**
 * Labels the mailbox's messages with the space's own tags.
 *
 * One decision call per message answers all three questions at once — needs a reply, which label,
 * how urgent — and each answer is applied only if its confidence clears the threshold, so an unsure
 * model leaves the message alone rather than guessing. Messages already carrying one of these tags
 * are skipped, which makes a re-run cheap and idempotent without a cursor.
 */
const handler = LabelerOperation.LabelMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, batchLimit, minConfidence }) {
      const limit = Math.min(
        batchLimit ?? LabelerOperation.DEFAULT_LABEL_MAILBOX_BATCH_LIMIT,
        LabelerOperation.MAX_LABEL_MAILBOX_BATCH_LIMIT,
      );
      const threshold = minConfidence ?? DEFAULT_MIN_CONFIDENCE;

      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const { db } = yield* Database.Service;

      // Provisioned lazily, as plugin-inbox does: a mailbox created before the field existed has none,
      // and feed messages are immutable snapshots that can only be tagged through the index.
      let index = mailbox.tags?.target;
      if (!index) {
        index = db.add(Obj.make(TagIndex.TagIndex, { index: {}, [Obj.Parent]: mailbox }));
        Obj.update(mailbox, (mailbox) => {
          mailbox.tags = Ref.make(index!);
        });
      }

      // The user's own tags are the choices; canonical and provider tags are not the user's vocabulary
      // and are owned by sync.
      const tags = (yield* Database.query(Filter.type(Tag.Tag)).run).filter((tag) => Tag.isUserTag(tag));
      const byLabel = new Map(tags.map((tag) => [tag.label, Obj.getURI(tag).toString()]));
      const criteria = Object.fromEntries(tags.map((tag) => [tag.label, tag.label]));

      const needsReplyTag = yield* Effect.promise(() => findOrCreateLabelerTag(db, 'needsReply'));
      const urgentTag = yield* Effect.promise(() => findOrCreateLabelerTag(db, 'urgent'));
      const needsReplyUri = Obj.getURI(needsReplyTag).toString();
      const urgentUri = Obj.getURI(urgentTag).toString();
      // A message carrying any tag this run could apply has been labelled already.
      const applied = new Set([needsReplyUri, urgentUri, ...byLabel.values()]);

      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const pending = messages
        .filter((message) => !Tagging.get(message, { index }).some((uri) => applied.has(uri)))
        .sort((left, right) => Date.parse(right.created) - Date.parse(left.created))
        .slice(0, limit);
      const skipped = messages.length - pending.length;

      const traceWriter = yield* Trace.TraceService;
      const progressKey = LabelerOperation.createLabelProgressKey(mailbox);
      const reportStatus = (current: number, message?: string) =>
        traceWriter.write(Trace.StatusUpdate, {
          message: message ?? mailbox.name ?? 'Mailbox',
          progress: { key: progressKey, current, total: pending.length },
        });

      log.info('label: start', {
        mailbox: Obj.getURI(mailbox),
        messages: messages.length,
        pending: pending.length,
        tags: tags.length,
      });
      reportStatus(0);

      let processed = 0;
      let labelled = 0;
      let needsReply = 0;
      let urgent = 0;

      for (const message of pending) {
        const context = messageState(message);
        // With no user tags there is nothing to choose between, so the label question is not asked.
        const decisions = yield* tags.length > 0
          ? DecisionModel.generate({ context, schema: labelQuestions(criteria) })
          : DecisionModel.generate({ context, schema: TriageQuestions });

        const verdict = toVerdict(decisions, threshold);
        const labelUri = verdict.label ? byLabel.get(verdict.label) : undefined;
        if (labelUri) {
          Tagging.set(message, labelUri, { index });
          labelled += 1;
        }
        if (verdict.needsReply) {
          Tagging.set(message, needsReplyUri, { index });
          needsReply += 1;
        }
        if (verdict.urgent) {
          Tagging.set(message, urgentUri, { index });
          urgent += 1;
        }

        processed += 1;
        reportStatus(processed, context.subject);
      }

      yield* Database.flush();
      log.info('label: done', { processed, labelled, needsReply, urgent, skipped });

      return { processed, labelled, needsReply, urgent, skipped };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
