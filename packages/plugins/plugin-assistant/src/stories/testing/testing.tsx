//
// Copyright 2025 DXOS.org
//

import { AiTool, AiToolkit } from '@effect/ai';
import { Console, Schema } from 'effect';

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
import { AiContextBinder, ArtifactId } from '@dxos/assistant';
import {
  DESIGN_BLUEPRINT,
  LINEAR_BLUEPRINT,
  PLANNING_BLUEPRINT,
  RESEARCH_BLUEPRINT,
  agent,
  localServiceEndpoints,
  readDocument,
  readTasks,
  remoteServiceEndpoints,
  research,
  syncLinearIssues,
  updateDocument,
  updateTasks,
} from '@dxos/assistant-testing';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { FunctionTrigger, FunctionType, exampleFunctions } from '@dxos/functions';
import { log } from '@dxos/log';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientCapabilities, ClientEvents, ClientPlugin } from '@dxos/plugin-client';
import { type ClientPluginOptions } from '@dxos/plugin-client/types';
import { DeckAction } from '@dxos/plugin-deck/types';
import { GraphPlugin } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown/types';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { Config } from '@dxos/react-client';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { withLayout } from '@dxos/storybook-utils';
import { trim } from '@dxos/util';

import { AssistantPlugin } from '../../AssistantPlugin';
import { Assistant } from '../../types';

// TODO(burdon): Factor out.
export const config = {
  remote: new Config({
    runtime: {
      services: {
        ai: {
          // TODO(burdon): Normalize props ('url'?)
          server: remoteServiceEndpoints.ai,
        },
        edge: {
          url: remoteServiceEndpoints.edge,
        },
      },
    },
  }),
  persistent: new Config({
    runtime: {
      client: {
        storage: {
          persistent: true,
        },
      },
      services: {
        ai: {
          server: remoteServiceEndpoints.ai,
        },
        edge: {
          url: remoteServiceEndpoints.edge,
        },
      },
    },
  }),
  local: new Config({
    runtime: {
      services: {
        ai: {
          server: localServiceEndpoints.ai,
        },
        edge: {
          url: localServiceEndpoints.edge,
        },
      },
    },
  }),
};

class TestingToolkit extends AiToolkit.make(
  AiTool.make('open-item', {
    description: trim`
      Opens an item in the application.
    `,
    parameters: {
      id: ArtifactId,
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),
) {
  static layer = (_context: PluginContext) =>
    TestingToolkit.toLayer({
      'open-item': ({ id }) => Console.log('Called open-item', { id }),
    });
}

type DecoratorsProps = Omit<ClientPluginOptions, 'onClientInitialized' | 'onSpacesReady'> & {
  plugins?: Plugin[];
  accessTokens?: DataType.AccessToken[];
  onInit?: (props: { space: Space; chat: Assistant.Chat; binder: AiContextBinder }) => Promise<void>;
};

/**
 * Create storybook decorators.
 */
export const getDecorators = ({ types = [], plugins = [], accessTokens = [], onInit, ...props }: DecoratorsProps) => [
  withPluginManager({
    plugins: [
      // System plugins.
      AttentionPlugin(),
      GraphPlugin(),
      IntentPlugin(),
      SettingsPlugin(),
      SpacePlugin(),
      ClientPlugin({
        types: [
          Markdown.Document,
          Assistant.Chat,
          Blueprint.Blueprint,
          Prompt.Prompt,
          DataType.AccessToken,
          FunctionTrigger,
          FunctionType,
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

          // Create chat and queue.
          const chat = space.db.add(
            Obj.make(Assistant.Chat, {
              queue: Ref.fromDXN(space.queues.create().dxn),
              traceQueue: Ref.fromDXN(space.queues.create().dxn),
            }),
          );

          await space.db.flush({ indexes: true });
          await onInit?.({ space, chat, binder: new AiContextBinder(await chat.queue.load()) });
          await space.db.flush({ indexes: true });
        },
        ...props,
      }),

      // Cards
      ThemePlugin({ tx: defaultTx }),
      StorybookLayoutPlugin(),
      PreviewPlugin(),

      // User plugins.
      AssistantPlugin(),

      // Custom.
      definePlugin({ id: 'example.com/plugin/testing', name: 'Testing' }, [
        defineModule({
          id: 'example.com/plugin/testing/module/testing',
          activatesOn: Events.SetupArtifactDefinition,
          activate: () => [
            contributes(Capabilities.BlueprintDefinition, DESIGN_BLUEPRINT),
            contributes(Capabilities.BlueprintDefinition, PLANNING_BLUEPRINT),
            contributes(Capabilities.BlueprintDefinition, RESEARCH_BLUEPRINT),
            contributes(Capabilities.BlueprintDefinition, LINEAR_BLUEPRINT),
            contributes(Capabilities.Functions, [readDocument, updateDocument]),
            contributes(Capabilities.Functions, [readTasks, updateTasks]),
            contributes(Capabilities.Functions, [research]),
            contributes(Capabilities.Functions, [syncLinearIssues]),
            contributes(Capabilities.Functions, [agent]),
            contributes(Capabilities.Functions, [exampleFunctions.reply]),
          ],
        }),
        defineModule({
          id: 'example.com/plugin/testing/module/toolkit',
          activatesOn: Events.Startup,
          activate: (context) => [
            contributes(Capabilities.Toolkit, TestingToolkit),
            contributes(Capabilities.ToolkitHandler, TestingToolkit.layer(context)),
          ],
        }),
        defineModule({
          id: 'example.com/plugin/testing/module/set-workspace',
          activatesOn: allOf(Events.DispatcherReady, ClientEvents.SpacesReady),
          activate: async (context) => {
            const client = context.getCapability(ClientCapabilities.Client);
            const space = client.spaces.default;
            const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: space.id }));
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
            ]),
          ],
        }),
      ]),

      // Test-specific.
      ...plugins,
    ],
  }),
  withLayout({
    fullscreen: true,
    classNames: 'justify-center bg-deckSurface',
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
    .map(([source, token]) => Obj.make(DataType.AccessToken, { source, token: token! }));
};
