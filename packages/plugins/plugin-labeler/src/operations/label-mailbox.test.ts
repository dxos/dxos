//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiService } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { Tagging, TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { LabelerOperationHandlerSet } from '#operations';
import { LabelerOperation } from '#types';

import { MessageState, NO_LABEL, URGENCY_SCALE } from '../questions.ts';

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

const SUBJECTS = ['Can you approve the invoice today?', 'July newsletter'];

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

const TestLayer = AssistantTestLayer({
  operationHandlers: LabelerOperationHandlerSet,
  types: [Cursor.Cursor, Feed.Feed, Mailbox.Mailbox, Message.Message, Tag.Tag, TagIndex.TagIndex],
  // The labeler never generates text; the runtime only needs a language model to resolve.
  aiService: Layer.succeed(
    AiService.AiService,
    AiService.make({
      languageModel: () => ScriptedLanguageModel.scriptedLanguageModelLayer([]),
      decisionModel: () => decisionModel,
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

describe('LabelMailbox operation', () => {
  it.effect(
    'applies the confident answers as tags and leaves the unsure ones alone',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const result = yield* Operation.invoke(LabelerOperation.LabelMailbox, { mailbox: Ref.make(mailbox) });
        expect(result.processed).toBe(2);
        expect(result.labelled).toBe(1);
        expect(result.needsReply).toBe(1);
        expect(result.urgent).toBe(1);

        expect(yield* taggedSubjects(mailbox, 'Billing')).toEqual(['Can you approve the invoice today?']);
        expect(yield* taggedSubjects(mailbox, 'Needs reply')).toEqual(['Can you approve the invoice today?']);
        expect(yield* taggedSubjects(mailbox, 'Urgent')).toEqual(['Can you approve the invoice today?']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a re-run skips what it already tagged',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        yield* Operation.invoke(LabelerOperation.LabelMailbox, { mailbox: Ref.make(mailbox) });
        const rerun = yield* Operation.invoke(LabelerOperation.LabelMailbox, { mailbox: Ref.make(mailbox) });

        // The newsletter got no tag, so it is asked about again; the tagged one is skipped.
        expect(rerun.processed).toBe(1);
        expect(rerun.skipped).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
