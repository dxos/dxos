//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiSession, GenerationObserver } from '@dxos/assistant';
import { Database, Filter, Obj, Relation, Tag, Type } from '@dxos/echo';
import { ContextQueueService, FunctionInvocationService, QueueService, TracingService } from '@dxos/functions';
import * as Trace from '@dxos/functions/Trace';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { HasSubject, Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { renderMarkdown } from '../util';
import { ClassifyEmail } from './definitions';

const handler: Operation.WithHandler<typeof ClassifyEmail> = ClassifyEmail.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ message }) {
        if (message['@type'] !== Type.getDXN(Message.Message)!.toString()) {
          log.info('not a message object, skipping classification', { message });
          return;
        }

        log.info('classify message', { message });

        const tags = yield* Database.runQuery(Filter.type(Tag.Tag));
        log.info('tags', { count: tags.length });

        if (tags.length === 0) {
          throw new Error('No tags available in the database');
        }

        const messageContent = Function.pipe([message], Array.flatMap(renderMarkdown), Array.join('\n\n'));
        const tagList = tags.map((tag) => `- ${tag.label}`).join('\n');

        const result = yield* new AiSession({
          observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'classify' })),
        }).run({
          prompt:
            `Classify the following email message by selecting the most appropriate tag from the available tags:\n\n` +
            `Email Message:\n${messageContent}\n\n` +
            `Available Tags:\n${tagList}\n\n` +
            `Select the single most appropriate tag for this message. Return only the tag label.`,
          system: CLASSIFY_SYSTEM_PROMPT,
          history: [],
        });

        const selectedTagLabel = Function.pipe(
          result,
          Array.findLast((msg) => msg.sender.role === 'assistant' && msg.blocks.some((block) => block._tag === 'text')),
          Option.flatMap((msg) =>
            Function.pipe(
              msg.blocks,
              Array.findLast((block) => block._tag === 'text'),
              Option.map((block) => block.text.trim()),
            ),
          ),
          Option.getOrThrowWith(() => new Error('No classification generated')),
        );

        log.info('selected tag label', { selectedTagLabel });

        const selectedTag = tags.find(
          (tag) => tag.label.toLowerCase().trim() === selectedTagLabel.toLowerCase().trim(),
        );

        if (!selectedTag) {
          return yield* Effect.fail(new Error(`Tag not found: ${selectedTagLabel}`));
        }

        log.info('selected tag', { tagId: Obj.getDXN(selectedTag).toString(), tagLabel: selectedTag.label });

        const messageDXN = DXN.parse(message['@dxn']);
        const queueDXNInfo = messageDXN.asQueueDXN();
        log.info('queueDXNInfo', queueDXNInfo);

        if (!queueDXNInfo) {
          return yield* Effect.fail(new Error('Message is not in a queue'));
        }

        const queueDXN = DXN.fromQueue(queueDXNInfo.subspaceTag, queueDXNInfo.spaceId, queueDXNInfo.queueId);
        const queue = yield* QueueService.getQueue(queueDXN);

        const relation = Relation.make(HasSubject.HasSubject, {
          [Relation.Source]: selectedTag,
          [Relation.Target]: Obj.make(Message.Message, {
            ...message,
            id: message.id,
          }),
          completedAt: new Date().toISOString(),
        });

        yield* QueueService.append(queue, [relation]).pipe(Effect.provide(ContextQueueService.layer(queue)));
        yield* Database.flush();

        return {
          tagId: Obj.getDXN(selectedTag).toString(),
          tagLabel: selectedTag.label,
        };
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('@anthropic/claude-haiku-4-5'),
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

const CLASSIFY_SYSTEM_PROMPT = trim`
  You are a helpful assistant that classifies email messages by selecting the most appropriate tag.

  # Goal
  Analyze the email message content (subject, sender, body) and select the single most appropriate tag from the provided list.

  # Instructions
  - Carefully read the email message content
  - Consider the subject, sender, and body text
  - Review all available tags and their purposes
  - Select the ONE tag that best categorizes this message
  - Return ONLY the tag label (exact match, case-insensitive)
  - Do not include any explanation or additional text

  # Response Format
  Return only the tag label as a single line of text, nothing else.
`;
