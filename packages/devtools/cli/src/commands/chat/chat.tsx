//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import { createSignal } from 'solid-js';

import { AiService, DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL, ModelName } from '@dxos/ai';
import { OpaqueToolkit } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppSpace } from '@dxos/app-toolkit';
import { type AiSession } from '@dxos/assistant';
import { CommandConfig, Common, withTypes } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import { Assistant } from '@dxos/plugin-assistant/types';

import { App, render } from '../../components';
import { theme } from '../../theme';
import {
  type AiChatServices,
  Provider,
  chatLayer,
  createLogBuffer,
  operationHandlers,
  toolkits,
  types,
} from '../../util';
import { Chat } from './components';
import { runNonInteractive } from './non-interactive';
import { ChatProcessor } from './processor';

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
    skills: Options.text('skill').pipe(
      Options.withDescription('Skills to include in the chat context.'),
      Options.withAlias('b'),
      Options.repeated,
    ),
    prompt: Options.text('prompt').pipe(
      Options.withDescription(
        'When set, runs the agent loop non-interactively with this prompt and exits — no TUI. Combine with --json to get structured object output.',
      ),
      Options.optional,
    ),
  },
  (options) =>
    Effect.gen(function* () {
      const { verbose, logLevel, json } = yield* CommandConfig;

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

      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const toolkit = OpaqueToolkit.merge(...toolkits);
      const processor = new ChatProcessor({
        runtime,
        toolkit,
        functions: operationHandlers,
        metadata: service.metadata,
        registry,
      });
      const [conversation, setConversation] = createSignal<AiSession.Session | undefined>(undefined);

      if (!client.halo.identity) {
        yield* Console.error('No HALO identity configured. Run `dx account login` first.');
        return;
      }
      const space = AppSpace.getPersonalSpace(client) ?? client.spaces.get()[0];
      if (!space) {
        yield* Console.error(
          'No space available for chat. Run `dx account login` or `dx space create --name "<name>"`.',
        );
        return;
      }

      const handleChatLoad = async () => {
        const chats = await space.db.query(Filter.type(Assistant.Chat)).run();
        log.info('chats', { chats: chats.length });
        // if (chats.length > 0) {
        //   await handleChatSelect(chats[0]);
        // } else {
        await handleChatCreate([]);
        // }
      };

      // TODO(burdon): Update message history, skills, etc.
      const handleChatSelect = async (chat: Assistant.Chat) => {
        const current = conversation();
        await current?.close();

        log.info('selecting conversation', { id: chat.id });
        const next = undefined;
        setConversation(next);
        return next;
      };

      const handleChatCreate = async (skills: string[]) => {
        const current = conversation();
        await current?.close();

        log.info('creating conversation', { skills });
        const next = await processor.createSession(space, skills);
        setConversation(next);
        return next;
      };

      // Non-interactive mode: --prompt runs the agent loop to completion and
      // exits without rendering the TUI. JSON output emits an array of
      // `{kind, dxn}` for the objects created or updated during the session.
      const nonInteractivePrompt = Option.getOrUndefined(options.prompt);
      if (nonInteractivePrompt !== undefined) {
        yield* Effect.promise(async () => {
          await runNonInteractive({
            space,
            processor,
            skills: [...options.skills],
            prompt: nonInteractivePrompt,
            model,
            json,
          });
        });
        return;
      }

      yield* Effect.promise(async () => {
        log.info('initializing', { skills: options.skills.length });
        if (options.skills.length) {
          await handleChatCreate(options.skills);
        } else {
          await handleChatLoad();
        }
      });

      // Render.
      yield* render({
        app: () => (
          <App
            debug={options.debug}
            focusElements={['input', 'messages']}
            logBuffer={logBuffer}
            registry={registry}
            theme={theme}
          >
            {conversation() && (
              <Chat
                db={space.db}
                processor={processor}
                conversation={conversation()!}
                model={model}
                verbose={verbose}
                onChatSelect={(chat) => handleChatSelect(chat)}
                onChatCreate={({ skills }) => handleChatCreate(skills)}
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
  Command.provide(({ provider, spaceId }) => chatLayer({ provider, spaceId, functions: operationHandlers })),
  Command.provideEffectDiscard(() => withTypes(...types)),
);
