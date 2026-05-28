//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { Markdown } from '@dxos/plugin-markdown';
import { ContentBlock, Message } from '@dxos/types';

import { SUMMARIZE_ID, SummarizeMessageExtractor, summarizeMessage } from './summarize-extractor';

const MOCK_SUMMARY = 'A mock summary of the email body in two short sentences.';

const LONG_BODY =
  'The product team plans the next release in four parts: scoping, prototyping, ' +
  'review, and rollout. Each phase has owners assigned from engineering and design. ' +
  'Status updates are expected by end of week so stakeholders can plan ahead. ' +
  'Please confirm receipt and respond with availability.';

// Build a fake AiService whose `model(...)` returns a LanguageModel layer that always responds
// with `MOCK_SUMMARY`, so the operation handler's `yield* LanguageModel.generateText(...)`
// resolves to a deterministic value without hitting any real provider.
const mockAiServiceLayer = Layer.succeed(AiService.AiService, {
  model: () =>
    Layer.scoped(
      LanguageModel.LanguageModel,
      LanguageModel.make({
        generateText: () => Effect.succeed([{ type: 'text', text: MOCK_SUMMARY }] as const) as any,
        streamText: () => Stream.empty as any,
      }),
    ),
});

const makeMessage = (text: string, subject = 'Quarterly planning') =>
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { email: 'planner@example.com' },
    properties: { subject },
    blocks: [ContentBlock.Text.make({ text })],
  });

describe('SummarizeMessageExtractor', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const result = await builder.createDatabase({ types: [Message.Message, Markdown.Document] });
    db = result.db;
  });

  afterEach(async () => {
    await builder.close();
  });

  test('id and kinds', ({ expect }) => {
    expect(SummarizeMessageExtractor.id).toBe(SUMMARIZE_ID);
    expect(SummarizeMessageExtractor.kinds).toContain('document');
    expect(SummarizeMessageExtractor.kinds).toContain('summary');
  });

  test('match — long text body matches with low confidence', ({ expect }) => {
    const result = SummarizeMessageExtractor.match(makeMessage(LONG_BODY));
    expect(result.matched).toBe(true);
    expect(result.confidence ?? 0).toBeLessThan(0.5);
  });

  test('match — short body does not match', ({ expect }) => {
    const result = SummarizeMessageExtractor.match(makeMessage('Hi there.'));
    expect(result.matched).toBe(false);
  });

  test('summarizeMessage — produces a Document containing the AI summary', async ({ expect }) => {
    // Exercise the core `summarizeMessage` Effect with a mocked AI service. The
    // MessageExtractor's `extract` field wraps this via `Operation.invoke`, but that path
    // adds Operation.Service / Capability.Service requirements that are irrelevant to
    // validating the AI prompt → Document mapping.
    const message = makeMessage(LONG_BODY);

    const result = await summarizeMessage({ db, message })
      .pipe(Effect.provide(mockAiServiceLayer))
      .pipe(runAndForwardErrors);

    expect(result.created).toHaveLength(1);
    expect(result.updated).toEqual([]);
    expect(result.relations).toEqual([]);

    const doc = result.created[0] as Markdown.Document;
    expect(Obj.instanceOf(Markdown.Document, doc)).toBe(true);
    expect(doc.name).toContain('Quarterly planning');
    expect(doc.name).toContain('summary');
    const text = await doc.content.tryLoad();
    expect(text?.content).toBe(MOCK_SUMMARY);
  });
});
