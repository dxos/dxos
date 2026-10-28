//
// Copyright 2026 DXOS.org
//

import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Semaphore from 'effect/Semaphore';

import { AiService, ExtractionModel } from '@dxos/ai';
import * as Progress from '@dxos/app-toolkit/Progress';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Tagging, TagIndex } from '@dxos/schema';
import { Message, Task, TaskSet } from '@dxos/types';

import { InboxOperation, Mailbox, SystemTags } from '#types';

import { TRIAGE_SOURCE, TriageTag, type TriageTagId } from './constants.ts';
import { EXTRACTION_MODEL, TaskFields, extractionState, toTasks } from './extraction.ts';
import { findOrCreateInboxProject } from './inbox-project.ts';
import {
  DECISION_MODEL,
  DEFAULT_MIN_CONFIDENCE,
  type Priority,
  TriageQuestions,
  labelQuestions,
  messageState,
  toVerdict,
} from './questions.ts';

/** The system tag each priority band is applied as. */
const PRIORITY_TAG: Record<Priority, SystemTags.PriorityTagId> = {
  urgent: 'priorityUrgent',
  high: 'priorityHigh',
  normal: 'priorityNormal',
  low: 'priorityLow',
};

/** A task's priority for a message's band; `Task` names the middle band `medium`. */
const TASK_PRIORITY: Record<Priority, Task.Task['priority']> = {
  urgent: 'urgent',
  high: 'high',
  normal: 'medium',
  low: 'low',
};

/** Finds-or-creates one of this plugin's own tags, keyed so a second run reuses it. */
const findOrCreateTriageTag = (db: Pick<Database.Database, 'query' | 'add'>, id: TriageTagId) =>
  Tag.findOrCreate(db, {
    key: { source: TRIAGE_SOURCE, id: TriageTag[id].id },
    label: TriageTag[id].label,
    hue: TriageTag[id].hue,
  });

/**
 * Triages the mailbox's messages: labels them with the space's own tags and a priority band, and files
 * what a message asks of the reader as tasks.
 *
 * One decision call per message answers all three questions at once — needs a reply, which label,
 * how urgent — and each answer is applied only if its confidence clears the threshold, so an unsure
 * model leaves the message alone rather than guessing. Messages already carrying one of these tags
 * are skipped, which makes a re-run cheap and idempotent without a cursor.
 */
const handler = InboxOperation.TriageMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, batchLimit, minConfidence, tasks: extractTasks = true }) {
      const limit = Math.min(
        batchLimit ?? InboxOperation.DEFAULT_TRIAGE_MAILBOX_BATCH_LIMIT,
        InboxOperation.MAX_TRIAGE_MAILBOX_BATCH_LIMIT,
      );
      const threshold = minConfidence ?? DEFAULT_MIN_CONFIDENCE;

      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const { db } = yield* Database.Service;

      // Provisioned lazily, as plugin-inbox does: a mailbox created before the field existed has none,
      // and feed messages are immutable snapshots that can only be tagged through the index.
      let index = mailbox.tags?.target;
      if (!index) {
        index = yield* Database.add(Obj.make(TagIndex.TagIndex, { index: {}, [Obj.Parent]: mailbox }));
        Obj.update(mailbox, (mailbox) => {
          mailbox.tags = Ref.make(index!);
        });
      }

      // The user's own tags are the choices; canonical and provider tags are not the user's vocabulary
      // and are owned by sync.
      // Keyed by the tag's own URI, not its label: nothing stops two user tags sharing a label, and
      // a label used as the choice key would collapse them and apply whichever won the map.
      const tags = (yield* Database.query(Filter.type(Tag.Tag)).run).filter((tag) => Tag.isUserTag(tag));
      const tagUris = tags.map((tag) => Obj.getURI(tag).toString());
      const criteria = Object.fromEntries(tags.map((tag, index) => [tagUris[index], tag.label]));

      const needsReplyTag = yield* Effect.promise(() => findOrCreateTriageTag(db, 'needsReply'));
      const needsReplyUri = Obj.getURI(needsReplyTag).toString();
      const priorityUris = Object.fromEntries(
        yield* Effect.forEach(
          Object.entries(PRIORITY_TAG),
          Effect.fnUntraced(function* ([priority, id]) {
            const tag = yield* Effect.promise(() => SystemTags.findOrCreateSystemTag(db, id));
            return [priority, Obj.getURI(tag).toString()] as const;
          }),
        ),
      );
      // A message carrying a priority has been triaged already; one labelled before priorities existed
      // is triaged again, which only adds its band.
      const applied = new Set(Object.values(priorityUris));

      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const pending = messages
        .filter((message) => !Tagging.get(message, { index }).some((uri) => applied.has(uri)))
        .sort((left, right) => Date.parse(right.created) - Date.parse(left.created))
        .slice(0, limit);
      const skipped = messages.length - pending.length;

      // Inbox records the contacts and summaries it extracts on sync in the same per-message ledger as
      // triage's tasks, so only a recorded Task marks a message as already read for tasks. Scoped to
      // this batch's ledger entries, so the lookup stays bounded by the batch limit.
      const recordedIds = pending
        .flatMap((message) => Mailbox.getExtractedObjectIds(mailbox, message.id))
        .filter((id) => EntityId.isValid(id));
      const taskIds = new Set(
        recordedIds.length > 0
          ? (yield* Database.query(Filter.and(Filter.type(Task.Task), Filter.id(...recordedIds))).run).map(
              (task) => task.id,
            )
          : [],
      );

      const traceWriter = yield* Trace.TraceService;
      const progressKey = InboxOperation.createTriageProgressKey(mailbox);
      const reportStatus = (current: number, message?: string) =>
        traceWriter.write(Trace.StatusUpdate, {
          message: message ?? mailbox.name ?? 'Mailbox',
          progress: { key: progressKey, current, total: pending.length },
        });

      // Created on the first task, so a run that extracts nothing leaves no empty project behind. One
      // permit: messages are answered concurrently, and each would otherwise create its own project.
      let taskSet: TaskSet.TaskSet | undefined;
      const projectLock = yield* Semaphore.make(1);
      const ensureTaskSet = () =>
        Effect.gen(function* () {
          if (!taskSet) {
            const project = yield* findOrCreateInboxProject(mailbox);
            taskSet = project.taskSet ? yield* Database.load(project.taskSet) : undefined;
          }
          return taskSet;
        }).pipe(projectLock.withPermits(1));

      log.info('triage: start', {
        mailbox: Obj.getURI(mailbox),
        messages: messages.length,
        pending: pending.length,
        tags: tags.length,
      });
      reportStatus(0);

      // Each message's questions are independent, so the calls overlap; the tally is folded from the
      // results rather than mutated in the loop, which no longer runs in order.
      let processed = 0;
      const verdicts = yield* Effect.forEach(
        pending,
        Effect.fnUntraced(function* (message) {
          const context = messageState(message);
          // With no user tags there is nothing to choose between, so the label question is not asked.
          const { answers } = yield* tags.length > 0
            ? DecisionModel.decide(labelQuestions(criteria), { input: context })
            : DecisionModel.decide(TriageQuestions, { input: context });

          const verdict = toVerdict(answers, threshold);
          log.info('triage: verdict', { subject: context.subject, answers, verdict });
          // The choice key IS the tag's URI, so a confident answer resolves without a lookup by label.
          const labelUri = verdict.label && tagUris.includes(verdict.label) ? verdict.label : undefined;
          if (labelUri) {
            Tagging.set(message, labelUri, { index });
          }
          if (verdict.needsReply) {
            Tagging.set(message, needsReplyUri, { index });
          }
          Tagging.set(message, priorityUris[verdict.priority], { index });

          // Only a message asking something of the recipient is read for tasks, and only once.
          const extracted = Mailbox.getExtractedObjectIds(mailbox, message.id).some((id) => taskIds.has(id));
          const tasks =
            extractTasks && !extracted && verdict.needsReply
              ? yield* ExtractionModel.extract(TaskFields, {
                  state: extractionState(message),
                  referenceDate: message.created.slice(0, 10),
                }).pipe(
                  Effect.map(({ answers }) => toTasks(answers)),
                  Effect.provide(AiService.extractionModel(EXTRACTION_MODEL)),
                  // A failed extraction (or no extraction model) leaves the message labelled; tasks are
                  // a bonus, not the run.
                  Effect.catch((error) =>
                    Effect.sync(() => {
                      log.warn('triage: extraction failed', { subject: context.subject, error });
                      return [];
                    }),
                  ),
                )
              : [];
          if (tasks.length > 0) {
            const target = yield* ensureTaskSet();
            const created = yield* Effect.forEach(tasks, (task) =>
              Database.add(
                Task.make({
                  title: task.title,
                  status: 'todo',
                  priority: TASK_PRIORITY[verdict.priority],
                  description: describeSource(message, task.due),
                  artifacts: [Ref.make(message)],
                }),
              ),
            );
            if (target) {
              for (const task of created) {
                TaskSet.addTaskToSet(target, task);
              }
            }
            Mailbox.recordExtraction(
              mailbox,
              message.id,
              created.map((task) => task.id),
            );
          }

          reportStatus((processed += 1), context.subject);
          return {
            labelled: labelUri !== undefined,
            needsReply: verdict.needsReply,
            urgent: verdict.urgent,
            tasks: tasks.length,
          };
        }),
        { concurrency: InboxOperation.TRIAGE_MAILBOX_CONCURRENCY },
      ).pipe(
        Effect.provide(AiService.decisionModel(DECISION_MODEL)),
        // Only a terminal status ends the mailbox's meter, so a run that stops early must still send one.
        Effect.onError((cause) =>
          Effect.sync(() =>
            reportStatus(
              processed,
              Cause.hasInterruptsOnly(cause) ? Progress.STATUS_CANCELLED : Progress.STATUS_FAILED,
            ),
          ),
        ),
      );

      const count = (predicate: (verdict: (typeof verdicts)[number]) => boolean) => verdicts.filter(predicate).length;
      const labelled = count((result) => result.labelled);
      const needsReply = count((result) => result.needsReply);
      const urgent = count((result) => result.urgent);
      const tasks = verdicts.reduce((sum, result) => sum + result.tasks, 0);

      yield* Database.flush().pipe(
        Effect.onError((cause) =>
          Effect.sync(() =>
            reportStatus(
              processed,
              Cause.hasInterruptsOnly(cause) ? Progress.STATUS_CANCELLED : Progress.STATUS_FAILED,
            ),
          ),
        ),
      );
      log.info('triage: done', { processed, labelled, needsReply, urgent, tasks, skipped });
      reportStatus(processed, Progress.STATUS_COMPLETE);

      return { processed, labelled, needsReply, urgent, tasks, skipped };
    }),
  ),
  Operation.opaqueHandler,
);

/** Where a task came from, in words: the email and who sent it (the task's artifact references it). */
const describeSource = (message: Message.Message, due: string | undefined): string => {
  const sender = message.sender?.name ?? message.sender?.email ?? 'unknown';
  const address = message.sender?.email && message.sender.name ? ` <${message.sender.email}>` : '';
  const subject = message.properties?.subject ?? '(no subject)';
  return `From "${subject}" by ${sender}${address}.${due ? ` Due ${due}.` : ''}`;
};

export default handler;
