//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiRequest, GenerationObserver } from '@dxos/assistant';
import { Trace, Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Relation, Tag, Type } from '@dxos/echo';
import { registryLayerNoop } from '@dxos/echo/testing';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { HasSubject, Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { InboxOperation, Mailbox } from '../types';
import { renderMarkdown } from '../util';

const handler: Operation.WithHandler<typeof InboxOperation.ClassifyEmail> = InboxOperation.ClassifyEmail.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ message }) {
        if (message['@type'] !== Type.getURI(Message.Message)) {
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

        const result = yield* new AiRequest.Request({
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

        log.info('selected tag', { tagId: Obj.getURI(selectedTag), tagLabel: selectedTag.label });

        // Find the feed by querying for mailboxes in the database.
        // After the identifier refactor, message DXNs are ECHO-kind (dxn:echo:spaceId:itemId)
        // and no longer embed the queue/feed ID. We locate the feed via the mailbox object.
        // Accept new `@uri` and legacy `@dxn` field name for backward compat with old snapshots.
        const messageEchoId = EID.tryParse((message as any)['@uri'] ?? (message as any)['@dxn']);
        if (!messageEchoId) {
          return yield* Effect.fail(new Error('Message does not have a valid DXN'));
        }

        const mailboxes = yield* Database.runQuery(Filter.type(Mailbox.Mailbox));
        if (mailboxes.length === 0) {
          return yield* Effect.fail(new Error('No mailbox found in database'));
        }

        // Use the first mailbox whose feed exists.
        const mailbox = mailboxes.find((mb) => mb.feed?.target != null);
        if (!mailbox) {
          return yield* Effect.fail(new Error('No mailbox with a feed found'));
        }

        const feed = mailbox.feed!.target as Feed.Feed;
        log.info('found feed via mailbox', { mailboxId: mailbox.id, feedDxn: Feed.getQueueUri(feed)?.toString() });

        const relation = Relation.make(HasSubject.HasSubject, {
          [Relation.Source]: selectedTag,
          [Relation.Target]: Obj.make(Message.Message, {
            ...message,
            id: message.id,
          }),
          completedAt: new Date().toISOString(),
        });

        yield* Feed.append(feed, [relation]);
        yield* Database.flush();

        return {
          tagId: Obj.getURI(selectedTag),
          tagLabel: selectedTag.label,
        };
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('ai.claude.model.claude-haiku-4-5'),
          ToolResolverService.layerEmpty,
          ToolExecutionService.layerEmpty,
          Trace.writerLayerNoop,
          Database.notAvailable,
          Feed.notAvailable,
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
