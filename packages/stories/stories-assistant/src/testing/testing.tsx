//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Console from 'effect/Console';
import * as Schema from 'effect/Schema';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import {
  ActivationEvent,
  Capability,
  Common,
  IntentPlugin,
  Plugin,
  SettingsPlugin,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AiContextBinder, ArtifactId, GenericToolkit } from '@dxos/assistant';
import { Agent, DesignBlueprint, Document, PlanningBlueprint, Research, Tasks } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { Example, Function, Trigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
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
import { AccessToken } from '@dxos/types';
import { defaultTx } from '@dxos/ui-theme';
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

  export const createLayer = (_context: Capability.PluginContext) =>
    Toolkit$.toLayer({
      'open-item': ({ id }) => Console.log('Called open-item', { id }),
    });
}

type DecoratorsProps = {
  plugins?: Plugin.Plugin[];
  accessTokens?: AccessToken.AccessToken[];
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
          AccessToken.AccessToken,
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
    .map(([source, token]) => Obj.make(AccessToken.AccessToken, { source, token: token! }));
};

type StoryPluginOptions = {
  onChatCreated?: (props: { space: Space; chat: Assistant.Chat; binder: AiContextBinder }) => Promise<void>;
};

const StoryPlugin = Plugin.define<StoryPluginOptions>({
  id: 'example.com/plugin/testing',
  name: 'Testing',
}).pipe(
  Plugin.addModule({
    id: 'example.com/plugin/testing/module/testing',
    activatesOn: Common.ActivationEvent.SetupArtifactDefinition,
    activate: () => [
      Capability.contributes(Common.Capability.BlueprintDefinition, DesignBlueprint),
      Capability.contributes(Common.Capability.BlueprintDefinition, PlanningBlueprint),
      Capability.contributes(Common.Capability.Functions, [Agent.prompt]),
      Capability.contributes(Common.Capability.Functions, [Document.read, Document.update]),
      Capability.contributes(Common.Capability.Functions, [Tasks.read, Tasks.update]),
      Capability.contributes(Common.Capability.Functions, [Research.create, Research.research]),
      Capability.contributes(Common.Capability.Functions, [Example.reply]),
    ],
  }),
  Plugin.addModule({
    id: 'example.com/plugin/testing/module/toolkit',
    activatesOn: Common.ActivationEvent.Startup,
    activate: (context) => [
      Capability.contributes(
        Common.Capability.Toolkit,
        GenericToolkit.make(TestingToolkit.Toolkit, TestingToolkit.createLayer(context)),
      ),
    ],
  }),
  Plugin.addModule({
    id: 'example.com/plugin/testing/module/setup',
    activatesOn: ActivationEvent.allOf(Common.ActivationEvent.DispatcherReady, ClientEvents.SpacesReady),
    activate: async (context) => {
      const client = context.getCapability(ClientCapabilities.Client);
      const space = client.spaces.default;
      const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);

      // Ensure workspace is set.
      await dispatch(createIntent(Common.LayoutAction.SwitchWorkspace, { part: 'workspace', subject: space.id }));

      // Create initial chat.
      await dispatch(createIntent(AssistantAction.CreateChat, { db: space.db }));

      return [];
    },
  }),
  Plugin.addModule(({ onChatCreated }) => ({
    id: 'example.com/plugin/testing/module/intent-resolver',
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: (context) => [
      Capability.contributes(Common.Capability.IntentResolver, [
        createResolver({
          intent: DeckAction.ChangeCompanion,
          resolve: () => ({}),
        }),
        createResolver({
          intent: AssistantAction.CreateChat,
          position: 'hoist',
          resolve: async ({ db, name }) => {
            const client = context.getCapability(ClientCapabilities.Client);
            const space = client.spaces.get(db.spaceId);
            invariant(space, 'Space not found');

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
  })),
  Plugin.make,
);
