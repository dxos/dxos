//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiService, ExtractionModel } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import { Tagging, TagIndex, Text } from '@dxos/schema';
import { Message, Outline, Task, TaskSet } from '@dxos/types';

import { InboxOperationHandlerSet } from '#operations';
import { InboxOperation, Mailbox } from '#types';

import { MessageState, NO_LABEL, URGENCY_SCALE } from './questions.ts';

/**
 * Canned answers keyed by subject. The model itself is exercised live in `@dxos/ai`'s
 * `TypeSafeResolver`; what needs pinning here is the other half — that an answer becomes the right tag
 * on the right message, and that a re-run asks about nothing.
 */
// The choice key is the tag's URI (labels are not unique), so the fixture learns it when the space
// is seeded rather than hard-coding a label.
let billingTagUri = '';

const ANSWERS = (): Record<string, Record<string, DecisionModel.ProviderAnswer>> => ({
  'Can you approve the invoice today?': {
    needsReply: { _tag: 'Probability', probability: 0.95 },
    urgency: { _tag: 'Rate', rating: 1.9, confidence: 0.9, probabilities: urgencyProbabilities(2) },
    label: { _tag: 'Classify', label: billingTagUri, confidence: 0.9, probabilities: labelProbabilities() },
  },
  'Could you review the board deck?': {
    needsReply: { _tag: 'Probability', probability: 0.9 },
    urgency: { _tag: 'Rate', rating: 1, confidence: 0.9, probabilities: urgencyProbabilities(1) },
    label: { _tag: 'Classify', label: NO_LABEL, confidence: 0.9, probabilities: { [billingTagUri]: 0, [NO_LABEL]: 1 } },
  },
  'July newsletter': {
    needsReply: { _tag: 'Probability', probability: 0.05 },
    urgency: { _tag: 'Rate', rating: 0.1, confidence: 0.9, probabilities: urgencyProbabilities(0) },
    // Below the threshold, so nothing is applied rather than a guess.
    label: { _tag: 'Classify', label: billingTagUri, confidence: 0.2, probabilities: labelProbabilities() },
  },
});

/** All of the weight on one urgency level. */
const urgencyProbabilities = (level: number) =>
  Object.fromEntries(URGENCY_SCALE.map((criterion, index) => [criterion, index === level ? 1 : 0]));

/** All of the weight on the billing tag. */
const labelProbabilities = () => ({ [billingTagUri]: 1, [NO_LABEL]: 0 });

const SUBJECTS = ['Can you approve the invoice today?', 'Could you review the board deck?', 'July newsletter'];

const decisionModel = Layer.effect(
  DecisionModel.DecisionModel,
  DecisionModel.make({
    decide: ({ state }) =>
      Effect.sync(() => {
        const subject = Schema.decodeUnknownSync(MessageState)(state).subject;
        return { answers: ANSWERS()[subject] ?? {}, usage: { inputTokens: undefined, outputTokens: undefined } };
      }),
  }),
);

/** Canned extractions keyed by the subject line of the state Clairic reads. */
const extractionModel = Layer.succeed(
  ExtractionModel.ExtractionModel,
  ExtractionModel.make(({ state }) =>
    Effect.succeed<ExtractionModel.ProviderResult>({
      answers: state.includes('Subject: Can you approve the invoice today?')
        ? {
            task_1: { value: 'approve the invoice today.', confidence: 0.8 },
            task_2: { value: 'Approve the invoice today', confidence: 0.6 },
            task_3: { value: 'forward it to finance', confidence: 0.1 },
            due: { value: '2026-07-01' },
          }
        : state.includes('Subject: Could you review the board deck?')
          ? { task_1: { value: 'review the board deck', confidence: 0.5 } }
          : {},
    }),
  ),
);

const TestLayer = AssistantTestLayer({
  operationHandlers: InboxOperationHandlerSet.handlers,
  types: [
    Cursor.Cursor,
    Feed.Feed,
    Instructions.Instructions,
    Mailbox.Mailbox,
    Message.Message,
    Outline.Outline,
    Project.Project,
    Tag.Tag,
    TagIndex.TagIndex,
    Task.Task,
    TaskSet.TaskSet,
    Text.Text,
  ],
  // Triage never generates text; the runtime only needs a language model to resolve.
  aiService: Layer.succeed(
    AiService.AiService,
    AiService.make({
      languageModel: () => ScriptedLanguageModel.layer([]),
      decisionModel: () => decisionModel,
      extractionModel: () => extractionModel,
    }),
  ),
});

const seedMailbox = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  // A user tag — the vocabulary the choice question is asked against.
  const billing = db.add(Obj.make(Tag.Tag, { label: 'Billing' }));
  billingTagUri = Obj.getURI(billing).toString();
  yield* Effect.promise(() =>
    db.appendToFeed(
      feed,
      SUBJECTS.map((subject, index) =>
        Message.make({
          created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
          sender: { email: 'someone@example.com' },
          blocks: [{ _tag: 'text', text: subject }],
          properties: { subject },
        }),
      ),
    ),
  );
  yield* Effect.promise(() => db.flush());
  return { db, mailbox };
});

/** Subjects of the mailbox's messages carrying the tag with the given label. */
const taggedSubjects = Effect.fnUntraced(function* (mailbox: Mailbox.Mailbox, label: string) {
  const tags = yield* Database.query(Filter.type(Tag.Tag)).run;
  const tag = tags.find((candidate) => candidate.label === label);
  const index = yield* Database.load(mailbox.tags);
  const feed = yield* Database.load(mailbox.feed);
  const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
  return tag
    ? messages
        .filter((message) => Tagging.get(message, { index }).includes(Obj.getURI(tag).toString()))
        .map((message) => message.properties?.subject)
    : [];
});

describe('TriageMailbox operation', () => {
  it.effect(
    'applies the confident answers as tags and leaves the unsure ones alone',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const result = yield* Operation.invoke(InboxOperation.TriageMailbox, { mailbox: Ref.make(mailbox) });
        expect(result.processed).toBe(3);
        expect(result.labelled).toBe(1);
        expect(result.needsReply).toBe(2);
        expect(result.urgent).toBe(1);

        expect(yield* taggedSubjects(mailbox, 'Billing')).toEqual(['Can you approve the invoice today?']);
        expect(yield* taggedSubjects(mailbox, 'Needs reply')).toEqual([
          'Can you approve the invoice today?',
          'Could you review the board deck?',
        ]);
        expect(yield* taggedSubjects(mailbox, 'High priority')).toEqual(['Could you review the board deck?']);
        expect(yield* taggedSubjects(mailbox, 'Urgent')).toEqual(['Can you approve the invoice today?']);
        // Every message lands in a band, so the newsletter is low rather than untagged.
        expect(yield* taggedSubjects(mailbox, 'Low priority')).toEqual(['July newsletter']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'files the confident, distinct action items as tasks in the mailbox project',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const result = yield* Operation.invoke(InboxOperation.TriageMailbox, { mailbox: Ref.make(mailbox) });
        // The duplicate (by title) and the low-confidence slot are dropped; the newsletter asks nothing.
        expect(result.tasks).toBe(2);

        // Both messages are answered at once, and still file into one project.
        const projects = yield* Database.query(Filter.type(Project.Project)).run;
        expect(projects).toHaveLength(1);
        const [project] = projects;
        expect(project.taskSet).toBeDefined();
        const tasks = project.taskSet ? yield* TaskSet.loadTasks(yield* Database.load(project.taskSet)) : [];
        expect(tasks.map((task) => [task.title, task.priority, task.status]).sort()).toEqual([
          ['Approve the invoice today', 'urgent', 'todo'],
          ['Review the board deck', 'high', 'todo'],
        ]);
        const invoiceTask = tasks.find((task) => task.title === 'Approve the invoice today');
        expect(invoiceTask?.description).toContain('Due 2026-07-01.');

        const feed = yield* Database.load(mailbox.feed);
        const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        const invoice = messages.find((message) => message.properties?.subject === SUBJECTS[0]);
        expect(invoice && Mailbox.getExtractedObjectIds(mailbox, invoice.id)).toEqual([invoiceTask?.id]);

        // A second run files nothing new: every message is triaged and the invoice already extracted.
        const rerun = yield* Operation.invoke(InboxOperation.TriageMailbox, { mailbox: Ref.make(mailbox) });
        expect(rerun.tasks).toBe(0);
        expect(yield* Database.query(Filter.type(Project.Project)).run).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reads a message for tasks when only contacts were extracted from it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();
        // Sync records the contacts it extracts in the same ledger triage records its tasks in.
        const feed = yield* Database.load(mailbox.feed);
        for (const message of yield* Feed.query(feed, Filter.type(Message.Message)).run) {
          Mailbox.recordExtraction(mailbox, message.id, [`person-${message.id}`]);
        }

        const result = yield* Operation.invoke(InboxOperation.TriageMailbox, { mailbox: Ref.make(mailbox) });

        expect(result.tasks).toBe(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a re-run skips what it already triaged',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        yield* Operation.invoke(InboxOperation.TriageMailbox, { mailbox: Ref.make(mailbox) });
        const rerun = yield* Operation.invoke(InboxOperation.TriageMailbox, { mailbox: Ref.make(mailbox) });

        // Both messages carry a priority band now, so neither is asked about again.
        expect(rerun.processed).toBe(0);
        expect(rerun.skipped).toBe(3);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
