//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiRequest, GenerationObserver } from '@dxos/assistant';
import { Operation, Trace } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { registryLayerNoop } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { VideoOperation } from '../types';

const handler: Operation.WithHandler<typeof VideoOperation.Summarize> = VideoOperation.Summarize.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ video }) {
        const videoObj = yield* Database.load(video);
        invariant(videoObj.transcript, 'Video has no transcript to summarize.');
        const transcriptObj = yield* Database.load(videoObj.transcript);
        const content = transcriptObj.content ?? '';
        invariant(content.trim().length > 0, 'Transcript is empty.');

        const result = yield* new AiRequest.Request({
          observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'summarize' })),
        }).run({
          prompt: content,
          history: [],
          system: systemPrompt,
        });

        const summaryText = Function.pipe(
          result,
          Array.findLast((msg) => msg.sender.role === 'assistant' && msg.blocks.some((block) => block._tag === 'text')),
          Option.flatMap((msg) =>
            Function.pipe(
              msg.blocks,
              Array.findLast((block) => block._tag === 'text'),
              Option.map((block) => block.text),
            ),
          ),
          Option.getOrThrowWith(() => new Error('No summary produced.')),
        );

        const summary = yield* Database.add(
          Text.make({ name: videoObj.name ? `${videoObj.name} (summary)` : 'Summary', content: summaryText }),
        );
        Obj.update(videoObj, (videoObj) => {
          videoObj.summary = Ref.make(summary);
        });

        return { summary: Ref.make(summary) };
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('ai.claude.model.claude-sonnet-4-6'),
          ToolResolverService.layerEmpty,
          ToolExecutionService.layerEmpty,
          Trace.writerLayerNoop,
          Layer.succeed(Operation.Service, {
            invoke: () => Effect.die('Not available.'),
            schedule: () => Effect.die('Not available.'),
            invokePromise: async () => ({ error: new Error('Not available.') }),
          } as any),
          registryLayerNoop,
        ),
      ),
    ),
  ),
);

export default handler;

const systemPrompt = trim`
  You are a helpful assistant that summarizes video transcripts.

  # Goal
  Create a concise markdown summary of the transcript.

  # Formatting
  - Respond with the summary only, without preamble like "Here is the summary:".
  - Use markdown headings and bullet points.
  - Lead with a one-sentence overview, then key points and takeaways.
`;
