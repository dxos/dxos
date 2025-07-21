//
// Copyright 2025 DXOS.org
//

import { pipe, Schema } from 'effect';
import { beforeAll, describe, test } from 'vitest';

import {
  EdgeAiServiceClient,
  Message,
  MixedStreamParser,
  OllamaAiServiceClient,
  type TextContentBlock,
} from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { Obj } from '@dxos/echo';
import type { EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { defineFunction, FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { DataType } from '@dxos/schema';
import { createTestData } from '@dxos/schema/testing';
import { AiService } from "@dxos/ai";

const REMOTE_AI = true;

const summarizationFn = defineFunction({
  description: 'Summarize a document',
  inputSchema: Schema.Struct({
    document: Schema.optional(DataType.Text),
    transcript: Schema.Array(DataType.Message),
  }),
  outputSchema: DataType.Text,
  handler: async ({ data: { document, transcript }, context }) => {
    const ai = context.getService(AiService);
    const result = await new MixedStreamParser().parse(
      await ai.client.execStream({
        model: '@anthropic/claude-3-5-haiku-20241022',
        systemPrompt: `
        You are a Transcript Summarizer.
        Transcript Summarizer update an existing summary within <summary> tags with a new transcript that is placed in <transcript> tags.
        Transcript Summarizer updates only the relevant parts of the summary.
        If there's no summary, create a new one.
        Transcript Summarizer outputs only the summary texts and nothing else.
        Transcript Summarizer keeps the original summary structure.
        Transcript Summarizer keeps the unrelated parts of the summary untouched.
        The Transcript Summarizer errs on the side of being too verbose.
        The Transcript Summarizer outputs the entire update summary.
        Transcript Summarizer outputs the entire update summary.
        The summary is formatted as hierarchical markdown bullet points with no headings.
        The hierarchical structure is deeply nested.
        The summarizer formats the bullets with "-" symbol as prefix and two spaces indentation.
        The Transcript Summarizer knows that the content of transcript will be updated solely by its output.
        The Transcript Summarizer outputs only the summary text.
      `,
        history: [
          Obj.make(Message, {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `
              <transcript>
                ${JSON.stringify(transcript, null, 2)}
              </transcript>
              `,
              },
              ...(document != null && document.content.length > 0
                ? [
                    {
                      type: 'text',
                      text: `
              <summary>
                ${document.content}
              </summary>
              `,
                    } satisfies TextContentBlock,
                  ]
                : []),
            ],
          }),
        ],
      }),
    );
    return Obj.make(DataType.Text, {
      content: pipe(result[0]?.content[0], (c) => (c?.type === 'text' ? c.text : '')),
    });
  },
});

const refinementFn = defineFunction({
  description: 'Refine a summary',
  inputSchema: Schema.Struct({
    summaries: Schema.Array(DataType.Text),
  }),
  outputSchema: Schema.Struct({
    summary: DataType.Text,
  }),
  handler: async ({ data: { summaries }, context }) => {
    const ai = context.getService(AiService);
    const result = await new MixedStreamParser().parse(
      await ai.client.execStream({
        model: '@anthropic/claude-3-5-haiku-20241022',
        systemPrompt: `
        You are a Transcript Summary Refiner.
        Transcript Summary Refiner works on a history of evolving summaries that were generated based on the transcript.
        The summaries are presented starting from the oldest to the newest.
        Each iteration of the summary contains a new part of the transcript.
        The Transcript Summary Refiner refines the summary based on the history of summaries.
        The Transcript Summary Refiner identifies any potential data lost between the iterations and adds its back to the output.
        The Transcript Summary Refiner updates the summary to be more structured.
        The Transcript Summary Refiner errs on the side of being too verbose.
        The Transcript Summary Refiner errs on keeping the original summary structure.
        Transcript Summary Refiner outputs the entire update summary.
        The summary is formatted as hierarchical markdown bullet points with no headings.
        The hierarchical structure is deeply nested.
        The Transcript Summary Refiner formats the bullets with "-" symbol as prefix and two spaces indentation.
        The Transcript Summary Refiner knows that the content of transcript will be updated solely by its output.
        The Transcript Summary Refiner outputs only the summary text.
      `,
        history: [
          Obj.make(Message, {
            role: 'user',
            content: summaries.map(
              (summary) =>
                ({
                  type: 'text',
                  text: `
              <summary>
                ${summary.content}
              </summary>
              `,
                }) satisfies TextContentBlock,
            ),
          }),
        ],
      }),
    );
    return {
      summary: Obj.make(DataType.Text, {
        content: pipe(result[0]?.content[0], (c) => (c?.type === 'text' ? c.text : '')),
      }),
    };
  },
});

describe.skip('Summarization', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let executor: FunctionExecutor;

  beforeAll(async () => {
    // TODO(dmaretskyi): Helper to scaffold this from a config.
    builder = await new EchoTestBuilder().open();
    const { db: db1 } = await builder.createDatabase({ indexing: { vector: true } });
    db = db1;
    executor = new FunctionExecutor(
      new ServiceContainer().setServices({
        ai: {
          client: REMOTE_AI
            ? new EdgeAiServiceClient({
                endpoint: AI_SERVICE_ENDPOINT.REMOTE,
                defaultGenerationOptions: {
                  // model: '@anthropic/claude-sonnet-4-20250514',
                  model: '@anthropic/claude-3-5-sonnet-20241022',
                },
              })
            : new OllamaAiServiceClient({
                overrides: {
                  model: 'llama3.1:8b',
                },
              }),
        },
        database: {
          db,
        },
      }),
    );
  });

  test('keeps transcript outline', { timeout: 1000_000 }, async () => {
    const { transcriptMessages } = createTestData();

    const summary = Obj.make(DataType.Text, {
      content: '',
    });

    const summaries = [];

    for (let i = 0; i < transcriptMessages.length; i++) {
      const blocks = transcriptMessages.slice(Math.max(0, i - 2), i + 1);
      const result = await executor.invoke(summarizationFn, {
        document: summary,
        transcript: blocks,
      });
      summary.content = result.content;
      summaries.push(Obj.make(DataType.Text, { content: result.content }));

      console.log(blocks.at(-1));
      console.log();
      console.log('--------------------------------');
      console.log();
      console.log(summary.content);
      console.log();

      if (i % 3 === 0 && i > 0) {
        const history: any = summaries.slice(-5);
        const result = await executor.invoke(refinementFn, {
          summaries: history,
        });
        summary.content = result.summary.content;
        summaries.push(Obj.make(DataType.Text, { content: result.summary.content }));

        console.log('REFINED');
        console.log();
        console.log('--------------------------------');
        console.log();
        console.log(summary.content);
        console.log();
      }
    }
  });
});
