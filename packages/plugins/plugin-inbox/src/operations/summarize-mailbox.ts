//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiSession, GenerationObserver } from '@dxos/assistant';
import {
  LocalSearchHandler,
  LocalSearchToolkit,
  ResearchGraph,
  makeGraphWriterHandler,
  makeGraphWriterToolkit,
} from '@dxos/assistant-toolkit';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { FunctionInvocationService, TracingService } from '@dxos/functions';
import * as Trace from '@dxos/functions/Trace';
import { Operation } from '@dxos/operation';
import { Message, Organization, Person, Pipeline } from '@dxos/types';
import { trim } from '@dxos/util';

import { renderMarkdown } from '../util';

import { SummarizeMailbox } from './definitions';

/**
 * Summarize a mailbox.
 */
const handler: Operation.WithHandler<typeof SummarizeMailbox> = SummarizeMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ mailbox: mailboxRef, skip = 0, limit = 20 }) {
        const mailbox = yield* Database.load(mailboxRef);
        const feed = yield* Database.load(mailbox.feed);
        const objects = yield* Feed.runQuery(feed, Filter.type(Message.Message));
        const messages = Function.pipe(
          objects,
          Array.reverse,
          Array.drop(skip),
          Array.take(limit),
          Array.filter((message) => Obj.instanceOf(Message.Message, message)),
          Array.flatMap(renderMarkdown),
          Array.join('\n\n'),
        );

        const GraphWriterToolkit = makeGraphWriterToolkit({
          schema: [Person.LegacyPerson, Pipeline.Pipeline, Organization.LegacyOrganization],
        });
        const GraphWriterHandler = makeGraphWriterHandler(GraphWriterToolkit);

        const toolkit = yield* Toolkit.merge(LocalSearchToolkit, GraphWriterToolkit).pipe(
          Effect.provide(
            Layer.mergeAll(
              //
              GraphWriterHandler,
              LocalSearchHandler,
            ).pipe(Layer.provide(ResearchGraph.contextQueueLayer)),
          ),
        );

        const result = yield* new AiSession({
          observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'summarize' })),
        }).run({
          prompt: messages,
          history: [],
          system: systemPrompt,
          toolkit,
        });

        const summary = Function.pipe(
          result,
          Array.findLast((msg) => msg.sender.role === 'assistant' && msg.blocks.some((block) => block._tag === 'text')),
          Option.flatMap((msg) =>
            Function.pipe(
              msg.blocks,
              Array.findLast((block) => block._tag === 'text'),
              Option.map((block) => block.text),
            ),
          ),
          Option.getOrThrowWith(() => new Error('No summary found')),
        );

        return { summary };
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('@anthropic/claude-sonnet-4-5'),
          ToolResolverService.layerEmpty,
          ToolExecutionService.layerEmpty,
          TracingService.layerNoop,
          FunctionInvocationService.layerNotAvailable,
          Trace.writerLayerNoop,
        ),
      ),
    ),
  ),
);

export default handler;

const systemPrompt = trim`
  You are a helpful assistant that summarizes mailboxes.

  # Goal
  Create a markdown summary of the mailbox with text notes provided.

  # Formatting
  - Format the summary as a markdown document without extra comments like "Here is the summary of the mailbox:".
  - Use markdown formatting for headings and bullet points.
  - Format the summary as a list of key points and takeaways.

  # Tasks
  At the end of the summary include tasks.
  Extract only the tasks that are:
  - Directly actionable.
  - Clearly assigned to a person or team (or can easily be inferred).
  - Strongly implied by the conversation and/or user note (no speculative tasks).
  - Specific enough that someone reading them would know exactly what to do next.

  Format all tasks as markdown checkboxes using the syntax:
  - [ ] Task description.

  Additional information can be included (indented).

  If no actionable tasks are found, omit this tasks section.
`;
