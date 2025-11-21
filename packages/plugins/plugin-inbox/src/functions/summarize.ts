//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiSession, ArtifactId, GenerationObserver } from '@dxos/assistant';
import {
  LocalSearchHandler,
  LocalSearchToolkit,
  contextQueueLayerFromResearchGraph,
  makeGraphWriterHandler,
  makeGraphWriterToolkit,
} from '@dxos/assistant-toolkit';
import { Obj } from '@dxos/echo';
import { DatabaseService, QueueService, TracingService, defineFunction } from '@dxos/functions';
import { Message, Organization, Person, Project } from '@dxos/types';
import { trim } from '@dxos/util';

import { Mailbox } from '../types';
import { renderMarkdown } from '../util';

/**
 * Summarize a mailbox.
 */
export default defineFunction({
  key: 'dxos.org/function/inbox/email-summarize',
  name: 'Summarize',
  description: 'Summarize a mailbox.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the mailbox object.',
    }),
    skip: Schema.Number.pipe(
      Schema.annotations({
        description: 'The number of messages to skip.',
      }),
      Schema.optional,
    ),
    limit: Schema.Number.pipe(
      Schema.annotations({
        description: 'The maximum number of messages to read. Do not provide a value unless directly asked.',
      }),
      Schema.optional,
    ),
  }),
  outputSchema: Schema.Struct({
    summary: Schema.String.annotations({
      description: 'The summary of the mailbox.',
    }),
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { id, skip = 0, limit = 20 } }) {
      const mailbox = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Mailbox.Mailbox);
      const queue = yield* QueueService.getQueue(mailbox.queue.dxn);
      yield* Effect.promise(() => queue?.queryObjects());
      const messages = Function.pipe(
        queue?.objects ?? [],
        Array.reverse,
        Array.drop(skip),
        Array.take(limit),
        Array.filter((message) => Obj.instanceOf(Message.Message, message)),
        Array.flatMap(renderMarkdown),
        Array.join('\n\n'),
      );

      const GraphWriterToolkit = makeGraphWriterToolkit({
        // TODO(wittjosiah): Anthropic does not support GeoPoint schema currently, causing legacy schemas to be needed.
        schema: [Person.LegacyPerson, Project.Project, Organization.LegacyOrganization],
      });
      const GraphWriterHandler = makeGraphWriterHandler(GraphWriterToolkit);

      const toolkit = yield* Toolkit.merge(LocalSearchToolkit, GraphWriterToolkit).pipe(
        Effect.provide(
          Layer.mergeAll(
            //
            GraphWriterHandler,
            LocalSearchHandler,
          ).pipe(Layer.provide(contextQueueLayerFromResearchGraph)),
        ),
      );

      const result = yield* new AiSession().run({
        prompt: messages,
        history: [],
        system: systemPrompt,
        toolkit,
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'summarize' })),
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
      ),
    ),
  ),
});

const researchPrompt = trim`
  # Research
  As the first step perform research:
    - Identify people, companies, projects, etc.
    - Search local database for existing entitities.
    - If the local entities don't exist, add new ones with graph-write tool.
    - In your summary include references to objects instead of their names in the following format:

    <example>
      We need to talk about @dxn:queue:data:B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ:01K24XMVHSZHS97SG1VTVQDM5Z:01K24XPK464FSCKVQJAB2H662M
    </example>
`;

// TODO(wittjosiah): Research is causing summaries to include a bunch of unreadable dxn references.
const includeResearch = false;
const systemPrompt = trim`
  You are a helpful assistant that summarizes mailboxes.

  ${includeResearch ? researchPrompt : ''}

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
