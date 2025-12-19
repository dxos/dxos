//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiSession, ArtifactId, GenerationObserver } from '@dxos/assistant';
import { Database, Filter, Obj, Relation, Tag } from '@dxos/echo';
import { ContextQueueService, QueueService, TracingService, defineFunction } from '@dxos/functions';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { HasSubject, Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { renderMarkdown } from '../util';

export default defineFunction({
  key: 'dxos.org/function/inbox/email-classify',
  name: 'Classify',
  description:
    'Classifies an email message by selecting and applying an appropriate tag from available tags in the database.',
  inputSchema: Schema.Struct({
    message: Schema.Any.annotations({
      description: 'The message object to classify.',
    }),
  }),
  outputSchema: Schema.Struct({
    tagId: ArtifactId.annotations({
      description: 'The ID of the selected tag.',
    }),
    tagLabel: Schema.String.annotations({
      description: 'The label of the selected tag.',
    }),
  }),
  types: [Message.Message, Tag.Tag, HasSubject.HasSubject],
  services: [AiService.AiService, Database.Service, QueueService],
  handler: Effect.fnUntraced(
    function* ({ data: { message } }) {
      log.info('classify message', { message });

      // Query all Tag objects
      const tags = yield* Database.Service.runQuery(Filter.type(Tag.Tag));
      log.info('tags', { count: tags.length });

      if (tags.length === 0) {
        throw new Error('No tags available in the database');
      }

      // Format message content
      const messageContent = Function.pipe([message], Array.flatMap(renderMarkdown), Array.join('\n\n'));

      // Build tag list for AI prompt
      const tagList = tags.map((tag) => `- ${tag.label}`).join('\n');

      // Generate AI classification
      const result = yield* new AiSession().run({
        prompt:
          `Classify the following email message by selecting the most appropriate tag from the available tags:\n\n` +
          `Email Message:\n${messageContent}\n\n` +
          `Available Tags:\n${tagList}\n\n` +
          `Select the single most appropriate tag for this message. Return only the tag label.`,
        system: CLASSIFY_SYSTEM_PROMPT,
        history: [],
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'classify' })),
      });

      // Extract the selected tag label from AI response
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

      // Find the matching tag (case-insensitive)
      const selectedTag = tags.find((tag) => tag.label.toLowerCase().trim() === selectedTagLabel.toLowerCase().trim());

      if (!selectedTag) {
        return yield* Effect.fail(new Error(`Tag not found: ${selectedTagLabel}`));
      }

      log.info('selected tag', { tagId: Obj.getDXN(selectedTag).toString(), tagLabel: selectedTag.label });

      // TODO(wittjosiah): Why does Obj.getDXN(message) return `dxn:echo:@:<object-id>`?
      // Get the message DXN and extract the queue DXN
      const messageDXN = DXN.parse(message['@dxn']);
      const queueDXNInfo = messageDXN.asQueueDXN();
      log.info('queueDXNInfo', queueDXNInfo);

      if (!queueDXNInfo) {
        return yield* Effect.fail(new Error('Message is not in a queue'));
      }

      // Create queue DXN without the objectId
      const queueDXN = DXN.fromQueue(queueDXNInfo.subspaceTag, queueDXNInfo.spaceId, queueDXNInfo.queueId);

      // Get the queue
      const queue = yield* QueueService.getQueue(queueDXN);

      // Create HasSubject relation from tag (source) to message (target)
      const relation = Relation.make(HasSubject.HasSubject, {
        [Relation.Source]: selectedTag,
        // TODO(wittjosiah): Using `message` directly gets an error.
        //   Error: invariant violation: Schema is not defined for the target.
        [Relation.Target]: Message.make({ ...message }),
        completedAt: new Date().toISOString(),
      });

      // Append the relation to the queue
      yield* QueueService.append(queue, [relation]).pipe(Effect.provide(ContextQueueService.layer(queue)));

      // TODO(wittjosiah): Flush queue?
      yield* Database.Service.flush();

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
      ),
    ),
  ),
});

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
