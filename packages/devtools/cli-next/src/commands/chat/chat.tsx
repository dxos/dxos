//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import { createSignal } from 'solid-js';

import { AiService, DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL, ModelName } from '@dxos/ai';
import { type AiConversation, GenericToolkit } from '@dxos/assistant';
import { ClientService } from '@dxos/client';
import { Filter } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Assistant } from '@dxos/plugin-assistant/types';

import { App, render } from '../../components';
import { CommandConfig } from '../../services';
import { theme } from '../../theme';
import {
  type AiChatServices,
  Provider,
  chatLayer,
  createLogBuffer,
  functions,
  toolkits,
  types,
  withTypes,
} from '../../util';
import { Common } from '../options';

import { Chat } from './components';
import { ChatProcessor } from './processor';
import { typeRegistry } from './types';

export const chat = Command.make(
  'chat',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    debug: Options.boolean('debug', { ifPresent: true }).pipe(
      Options.withDescription('Show console to see logs.'),
      Options.withAlias('d'),
    ),
    provider: Options.choice('provider', Provider.literals).pipe(
      Options.withDescription('AI provider to use.'),
      Options.withAlias('p'),
      Options.withDefault('edge'),
    ),
    model: Options.text('model').pipe(
      Options.withDescription('Model to use.'),
      Options.withAlias('m'),
      Options.withSchema(ModelName),
      Options.optional,
    ),
    blueprints: Options.text('blueprint').pipe(
      Options.withDescription('Blueprints to include in the chat context.'),
      Options.withAlias('b'),
      Options.repeated,
    ),
  },
  (options) =>
    Effect.gen(function* () {
      const { verbose, logLevel } = yield* CommandConfig;

      // Configure logging.
      const logBuffer = createLogBuffer();
      log.config({ filter: logLevel });
      log.runtimeConfig.processors = [logBuffer.processor];
      log.info('starting...', { options });

      const client = yield* ClientService;
      const runtime = yield* Effect.runtime<AiChatServices>();
      const service = yield* AiService.AiService;

      const model = Option.getOrElse(options.model, () =>
        Match.value(options.provider).pipe(
          Match.when('lmstudio', () => DEFAULT_LMSTUDIO_MODEL),
          Match.when('ollama', () => DEFAULT_OLLAMA_MODEL),
          Match.when('edge', () => DEFAULT_EDGE_MODEL),
          Match.orElse(() => DEFAULT_EDGE_MODEL),
        ),
      );

      const toolkit = GenericToolkit.merge(...toolkits);
      const processor = new ChatProcessor(runtime, toolkit, functions, service.metadata);
      const [conversation, setConversation] = createSignal<AiConversation | undefined>(undefined);

      invariant(client.halo.identity);
      const space = yield* Effect.promise(async () => {
        // TODO(burdon): Add dynamically.
        await client.addTypes(types);

        // TODO(burdon): Hangs if identity is not ready.
        await client.spaces.waitUntilReady();
        return client.spaces.default;
      });

      const handleChatLoad = async () => {
        const chats = await space.db.query(Filter.type(Assistant.Chat)).run();
        log.info('chats', { chats: chats.length });
        // if (chats.length > 0) {
        //   await handleChatSelect(chats[0]);
        // } else {
        await handleChatCreate([]);
        // }
      };

      // TODO(burdon): Update message history, blueprints, etc.
      const handleChatSelect = async (chat: Assistant.Chat) => {
        const current = conversation();
        await current?.close();

        log.info('selecting conversation', { id: chat.id });
        const next = undefined;
        setConversation(next);
        return next;
      };

      const handleChatCreate = async (blueprints: string[]) => {
        const current = conversation();
        await current?.close();

        log.info('creating conversation', { blueprints });
        const next = await processor.createConversation(space, blueprints);
        setConversation(next);
        return next;
      };

      yield* Effect.promise(async () => {
        log.info('initializing', { blueprints: options.blueprints.length });
        if (options.blueprints.length) {
          await handleChatCreate(options.blueprints);
        } else {
          await handleChatLoad();
        }
      });

      // Render.
      yield* render({
        app: () => (
          <App debug={options.debug} focusElements={['input', 'messages']} logBuffer={logBuffer} theme={theme}>
            {conversation() && (
              <Chat
                db={space.db}
                processor={processor}
                conversation={conversation()!}
                model={model}
                verbose={verbose}
                onChatSelect={(chat) => handleChatSelect(chat)}
                onChatCreate={({ blueprints }) => handleChatCreate(blueprints)}
              />
            )}
          </App>
        ),
        focusElements: ['input', 'messages'],
        logBuffer,
        debug: options.debug,
        theme,
      });
    }),
).pipe(
  Command.withDescription('Open chat interface.'),
  Command.provide(({ provider, spaceId }) => chatLayer({ provider, spaceId, functions })),
  Command.provideEffectDiscard(() => withTypes(...typeRegistry)),
);
