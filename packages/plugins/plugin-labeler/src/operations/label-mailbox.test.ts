//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { Tagging, TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { LabelerOperationHandlerSet } from '#operations';
import { LabelerOperation } from '#types';

/**
 * Canned answers keyed by subject. The TypeSafe provider is Effect's own; what needs pinning here is
 * the other half — that an answer becomes the right tag on the right message, and that a re-run asks
 * about nothing.
 */
// The label key is the tag's URI (labels are not unique), so the fixture learns it when the space
// is seeded rather than hard-coding a label.
let billingTagUri = '';

type Canned = { needsReply: number; rating: number; label: string; confidence: number };

const ANSWERS = (): Record<string, Canned> => ({
  'Can you approve the invoice today?': { needsReply: 0.95, rating: 1.9, label: billingTagUri, confidence: 0.9 },
  // Below the threshold, so nothing is applied rather than a guess.
  'July newsletter': { needsReply: 0.05, rating: 0.1, label: billingTagUri, confidence: 0.2 },
});

const SUBJECTS = ['Can you approve the invoice today?', 'July newsletter'];

/** All probability mass on one option; `DecisionModel` rejects a distribution that does not sum to 1. */
const certain = (options: readonly string[], chosen: string) =>
  Object.fromEntries(options.map((option) => [option, option === chosen ? 1 : 0]));

const decisionModelLayer = Layer.effect(
  DecisionModel.DecisionModel,
  DecisionModel.make({
    decide: ({ state, decisions }) =>
      Effect.sync(() => {
        const subject = typeof state === 'object' && state !== null && 'subject' in state ? String(state.subject) : '';
        const canned = ANSWERS()[subject];
        const answers: Record<string, DecisionModel.ProviderAnswer> = {};
        for (const [key, decision] of Object.entries(decisions)) {
          switch (decision._tag) {
            case 'Probability':
              answers[key] = { _tag: 'Probability', probability: canned.needsReply };
              break;
            case 'Rate': {
              const level = decision.criteria[Math.round(canned.rating)];
              answers[key] = {
                _tag: 'Rate',
                rating: canned.rating,
                probabilities: certain(decision.criteria, level),
                confidence: 0.9,
              };
              break;
            }
            case 'Classify':
              answers[key] = {
                _tag: 'Classify',
                label: canned.label,
                probabilities: certain(Object.keys(decision.criteria), canned.label),
                confidence: canned.confidence,
              };
              break;
          }
        }
        return { answers, usage: { inputTokens: undefined, outputTokens: undefined } };
      }),
  }),
);

const TestLayer = AssistantTestLayer({
  operationHandlers: LabelerOperationHandlerSet,
  types: [Cursor.Cursor, Feed.Feed, Mailbox.Mailbox, Message.Message, Tag.Tag, TagIndex.TagIndex],
  // Through the resolver, not `Effect.provide`: the operation runs in its own process, where an
  // inline provider is invisible.
  extraServices: decisionModelLayer,
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
