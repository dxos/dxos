//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineFunction
// @ts-nocheck

import { Schema, pipe } from 'effect';
import { beforeAll, describe, test } from 'vitest';

import { AiService, MixedStreamParser } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { FunctionExecutor, ServiceContainer, defineFunction } from '@dxos/functions';
import { type ContentBlock, DataType } from '@dxos/schema';
import { createTestData } from '@dxos/schema/testing';
import { trim } from '@dxos/util';

const summarizationFn = defineFunction({
  key: 'dxos.org/function/summarization/summarize',
  name: 'Summarize transcript',
  description: 'Summarize a document',
  inputSchema: Schema.Struct({
    document: Schema.optional(DataType.Text),
    transcript: Schema.Array(DataType.Message),
  }),
  outputSchema: DataType.Text,
  handler: async ({ data: { document, transcript }, context }) => {
    const ai = context.getService(AiService.AiService);
    const result = await new MixedStreamParser().parse(
      await ai.client.execStream({
        model: '@anthropic/claude-3-5-haiku-20241022',
        // TODO(burdon): Factor out and test prompts.
        systemPrompt: trim`
          Your job is to summarize a meeting transcript.
          Transcript Summarizer updates an existing summary within <summary> tags with a new transcript that is placed in <transcript> tags.
          Transcript Summarizer updates only the relevant parts of the summary.
          If there's no summary, create a new one.
          Transcript Summarizer outputs only the summary texts and nothing else.
          Transcript Summarizer keeps the original summary structure.
          Transcript Summarizer keeps the unrelated parts of the summary untouched.
          The Transcript Summarizer errs on the side of being too verbose.
          The Transcript Summarizer outputs the entire update summary.
          The summary is formatted as hierarchical markdown bullet points with no headings.
          The hierarchical structure is deeply nested.
          The Transcript Summarizer formats the bullets with "-" symbol as prefix and two spaces indentation.
          The Transcript Summarizer knows that the content of transcript will be updated solely by its output.
          The Transcript Summarizer outputs only the summary text.
        `,
        history: [
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            blocks: [
              {
                _tag: 'text',
                text: trim`
                  <transcript>
                    ${JSON.stringify(transcript, null, 2)}
                  </transcript>
                `,
              },
              ...(document != null && document.content.length > 0
                ? [
                    {
                      _tag: 'text',
                      text: trim`
                        <summary>
                          ${document.content}
                        </summary>
                      `,
                    } satisfies ContentBlock.Text,
                  ]
                : []),
            ],
          }),
        ],
      }),
    );

    return DataType.makeText(pipe(result[0]?.blocks[0], (c) => (c?._tag === 'text' ? c.text : '')));
  },
});

const refinementFn = defineFunction({
  key: 'dxos.org/function/summarization/refine',
  name: 'Refine transcript summary',
  description: 'Refine a summary',
  inputSchema: Schema.Struct({
    summaries: Schema.Array(DataType.Text),
  }),
  outputSchema: Schema.Struct({
    summary: DataType.Text,
  }),
  handler: async ({ data: { summaries }, context }) => {
    const ai = context.getService(AiService.AiService);
    const result = await new MixedStreamParser().parse(
      await ai.client.execStream({
        model: '@anthropic/claude-3-5-haiku-20241022',
        // TODO(burdon): Factor out and test prompts.
        systemPrompt: trim`
          You are a Transcript Summary Refiner.
          Transcript Summary Refiner works on a history of evolving summaries that were generated based on the transcript.
          The summaries are presented starting from the oldest to the newest.
          Each iteration of the summary contains a new part of the transcript.
          The Transcript Summary Refiner refines the summary based on the history of summaries.
          The Transcript Summary Refiner identifies any potential data lost between the iterations and adds its back to the output.
          The Transcript Summary Refiner updates the summary to be more structured.
          The Transcript Summary Refiner errs on the side of being too verbose.
          The Transcript Summary Refiner errs on keeping the original summary structure.
          The Transcript Summary Refiner outputs the entire update summary.
          The Transcript Summary is formatted as hierarchical markdown bullet points with no headings.
          The hierarchical structure is deeply nested.
          The Transcript Summary Refiner formats the bullets with "-" symbol as prefix and two spaces indentation.
          The Transcript Summary Refiner knows that the content of transcript will be updated solely by its output.
          The Transcript Summary Refiner outputs only the summary text.
        `,
        history: [
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            blocks: summaries.map(
              (summary) =>
                ({
                  _tag: 'text',
                  text: trim`
                    <summary>
                      ${summary.content}
                    </summary>
                  `,
                }) satisfies ContentBlock.Text,
            ),
          }),
        ],
      }),
    );
    return {
      summary: DataType.makeText(pipe(result[0]?.blocks[0], (c) => (c?._tag === 'text' ? c.text : ''))),
    };
  },
});

describe.skip('Summarization', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let executor: FunctionExecutor;

  // TODO(burdon): Rewrite test.
  beforeAll(async () => {
    // TODO(dmaretskyi): Helper to scaffold this from a config.
    builder = await new EchoTestBuilder().open();
    const { db: db1 } = await builder.createDatabase({ indexing: { vector: true } });
    db = db1;
    executor = new FunctionExecutor(
      new ServiceContainer().setServices({
        ai: todo(),
        database: {
          db,
        },
      }),
    );
  });

  test('keeps transcript outline', { timeout: 1000_000 }, async () => {
    const { transcriptMessages } = createTestData();

    const summary = DataType.makeText();

    const summaries = [];

    for (let i = 0; i < transcriptMessages.length; i++) {
      const blocks = transcriptMessages.slice(Math.max(0, i - 2), i + 1);
      const result = await executor.invoke(summarizationFn, {
        document: summary,
        transcript: blocks,
      });
      summary.content = result.content;
      summaries.push(DataType.makeText(result.content));

      console.log(blocks.at(-1));
      console.log();
      console.log(summary.content);
      console.log();

      if (i % 3 === 0 && i > 0) {
        const history: any = summaries.slice(-5);
        const result = await executor.invoke(refinementFn, {
          summaries: history,
        });
        summary.content = result.summary.content;
        summaries.push(DataType.makeText(result.summary.content));

        console.log('REFINED');
        console.log();
        console.log(summary.content);
        console.log();
      }
    }
  });
});
