//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Console from 'effect/Console';
import * as Schema from 'effect/Schema';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import {
  Capabilities,
  Events,
  IntentPlugin,
  LayoutAction,
  type Plugin,
  type PluginContext,
  SettingsPlugin,
  allOf,
  contributes,
  createIntent,
  createResolver,
  defineModule,
  definePlugin,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AiContextBinder, ArtifactId, GenericToolkit } from '@dxos/assistant';
import { Agent, DesignBlueprint, Document, PlanningBlueprint, Research, Tasks } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { Example, Function, Trigger } from '@dxos/functions';
import { log } from '@dxos/log';
import { Assistant, AssistantAction, AssistantPlugin } from '@dxos/plugin-assistant';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientCapabilities, ClientEvents, ClientPlugin } from '@dxos/plugin-client';
import { type ClientPluginOptions } from '@dxos/plugin-client/types';
import { DeckAction } from '@dxos/plugin-deck/types';
import { GraphPlugin } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown/types';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { type Client, Config } from '@dxos/react-client';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

// TODO(burdon): Factor out.
export const config = {
  remote: new Config({
    runtime: {
      services: SERVICES_CONFIG.REMOTE,
    },
  }),
  persistent: new Config({
    runtime: {
      client: {
        storage: {
          persistent: true,
        },
      },
      services: SERVICES_CONFIG.REMOTE,
    },
  }),
  local: new Config({
    runtime: {
      services: SERVICES_CONFIG.LOCAL,
    },
  }),
};

const Toolkit$ = Toolkit.make(
  Tool.make('open-item', {
    description: trim`
      Opens an item in the application.
    `,
    parameters: {
      id: ArtifactId,
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),
);

namespace TestingToolkit {
  export const Toolkit = Toolkit$;

  export const createLayer = (_context: PluginContext) =>
    Toolkit$.toLayer({
      'open-item': ({ id }) => Console.log('Called open-item', { id }),
    });
}

type DecoratorsProps = {
  plugins?: Plugin[];
  accessTokens?: DataType.AccessToken.AccessToken[];
  onInit?: (props: { client: Client; space: Space }) => Promise<void>;
} & (Omit<ClientPluginOptions, 'onClientInitialized' | 'onSpacesReady'> & Pick<StoryPluginOptions, 'onChatCreated'>);

/**
 * Create storybook decorators.
 */
export const getDecorators = ({
  types = [],
  plugins = [],
  accessTokens = [],
  onInit,
  onChatCreated,
  ...props
}: DecoratorsProps) => [
  withPluginManager({
    plugins: [
      // System plugins.
      AttentionPlugin(),
      AutomationPlugin(),
      GraphPlugin(),
      IntentPlugin(),
      SettingsPlugin(),
      SpacePlugin({}),
      ClientPlugin({
        types: [
          Assistant.Chat,
          Blueprint.Blueprint,
          DataType.AccessToken.AccessToken,
          Function.Function,
          Markdown.Document,
          Prompt.Prompt,
          Trigger.Trigger,
          ...types,
        ],
        onClientInitialized: async ({ client }) => {
          log('onClientInitialized', { identity: client.halo.identity.get()?.did });
          // Abort if already initialized.
          if (client.halo.identity.get()) {
            return;
          }

          await client.halo.createIdentity();
          await client.spaces.waitUntilReady();

          const space = client.spaces.default;
          // TODO(burdon): Should not require this.
          //  ERROR: invariant violation: Database was not initialized with root object.
          // TODO(burdon): onSpacesReady is never called.
          await space.waitUntilReady();

          // Add tokens.
          for (const accessToken of accessTokens) {
            space.db.add(Obj.clone(accessToken));
          }

          await space.db.flush({ indexes: true });
          await onInit?.({ client, space });
          await space.db.flush({ indexes: true });
        },
        ...props,
      }),

      // Cards
      ThemePlugin({ tx: defaultTx }),
      StorybookLayoutPlugin({}),
      PreviewPlugin(),

      // User plugins.
      AssistantPlugin(),
      StoryPlugin({ onChatCreated }),

      // Test-specific.
      ...plugins,
    ],
  }),
];

/**
 * Creates access tokens from environment variables.
 * @param tokens - Record of token sources mapped to their VITE_ prefixed environment variable values
 * @returns Array of AccessToken objects for non-empty token values
 * @example
 * ```tsx
 * const tokens = accessTokensFromEnv({
 *   'exa.ai': process.env.VITE_EXA_API_KEY,
 *   'linear.app': process.env.VITE_LINEAR_API_KEY
 * });
 * ```
 * @note All environment variables should use the VITE_ prefix for proper Vite bundling
 */

export const accessTokensFromEnv = (tokens: Record<string, string | undefined>) => {
  return Object.entries(tokens)
    .filter(([, token]) => !!token)
    .map(([source, token]) => Obj.make(DataType.AccessToken.AccessToken, { source, token: token! }));
};

type StoryPluginOptions = {
  onChatCreated?: (props: { space: Space; chat: Assistant.Chat; binder: AiContextBinder }) => Promise<void>;
};

const StoryPlugin = definePlugin<StoryPluginOptions>(
  {
    id: 'example.com/plugin/testing',
    name: 'Testing',
  },
  ({ onChatCreated }) => [
    defineModule({
      id: 'example.com/plugin/testing/module/testing',
      activatesOn: Events.SetupArtifactDefinition,
      activate: () => [
        contributes(Capabilities.BlueprintDefinition, DesignBlueprint),
        contributes(Capabilities.BlueprintDefinition, PlanningBlueprint),
        contributes(Capabilities.Functions, [Agent.prompt]),
        contributes(Capabilities.Functions, [Document.read, Document.update]),
        contributes(Capabilities.Functions, [Tasks.read, Tasks.update]),
        contributes(Capabilities.Functions, [Research.create, Research.update, Research.research]),
        contributes(Capabilities.Functions, [Example.reply]),
      ],
    }),
    defineModule({
      id: 'example.com/plugin/testing/module/toolkit',
      activatesOn: Events.Startup,
      activate: (context) => [
        contributes(Capabilities.Toolkit, GenericToolkit.make(TestingToolkit.Toolkit, TestingToolkit.createLayer(context))),
      ],
    }),
    defineModule({
      id: 'example.com/plugin/testing/module/setup',
      activatesOn: allOf(Events.DispatcherReady, ClientEvents.SpacesReady),
      activate: async (context) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const space = client.spaces.default;
        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);

        // Ensure workspace is set.
        await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: space.id }));

        // Create initial chat.
        await dispatch(createIntent(AssistantAction.CreateChat, { space }));

        return [];
      },
    }),
    defineModule({
      id: 'example.com/plugin/testing/module/intent-resolver',
      activatesOn: Events.SetupIntentResolver,
      activate: () => [
        contributes(Capabilities.IntentResolver, [
          createResolver({
            intent: DeckAction.ChangeCompanion,
            resolve: () => ({}),
          }),
          createResolver({
            intent: AssistantAction.CreateChat,
            position: 'hoist',
            resolve: async ({ space, name }) => {
              const queue = space.queues.create();
              const traceQueue = space.queues.create();
              const chat = Obj.make(Assistant.Chat, {
                name,
                queue: Ref.fromDXN(queue.dxn),
                traceQueue: Ref.fromDXN(traceQueue.dxn),
              });
              const binder = new AiContextBinder(queue);

              // Story-specific behaviour to allow chat creation to be extended.
              space.db.add(chat);
              await space.db.flush({ indexes: true });

              await binder.open();
              await onChatCreated?.({ space, chat, binder });
              await binder.close();

              return {
                data: { object: chat },
              };
            },
          }),
        ]),
      ],
    }),
  ],
);
