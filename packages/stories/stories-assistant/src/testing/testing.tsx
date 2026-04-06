//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type FC, ReactNode, useEffect, useMemo, useState } from 'react';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import {
  ActivationEvent,
  ActivationEvents,
  Capabilities,
  Capability,
  Plugin,
  PluginManager,
} from '@dxos/app-framework';
import { runAndForwardErrors } from '@dxos/effect';
import { type WithPluginManagerOptions, withPluginManager } from '@dxos/app-framework/testing';
import { useApp } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { AiContextBinder } from '@dxos/assistant';
import {
  AgentHandlers,
  DesignBlueprint,
  MarkdownBlueprint,
  MarkdownHandlers,
  PlanningBlueprint,
  PlanningHandlers,
} from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { ExampleHandlers, Trigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation, OperationHandlerSet } from '@dxos/operation';
import { Assistant, AssistantPlugin } from '@dxos/plugin-assistant';
import { AssistantOperation } from '@dxos/plugin-assistant/operations';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientCapabilities, ClientEvents, ClientPlugin } from '@dxos/plugin-client';
import { type ClientPluginOptions } from '@dxos/plugin-client/types';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { Markdown } from '@dxos/plugin-markdown/types';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin } from '@dxos/plugin-testing';
import { corePlugins } from '@dxos/plugin-testing';
import { type Client, Config } from '@dxos/react-client';
import { AccessToken } from '@dxos/types';

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

type LazyPluginsResult = {
  plugins: Plugin.Plugin[];
  types?: any[];
};

type DecoratorsProps = {
  plugins?: Plugin.Plugin[];
  lazyPlugins?: () => Promise<LazyPluginsResult>;
  accessTokens?: AccessToken.AccessToken[];
  onInit?: (props: { client: Client; space: Space }) => Promise<void>;
} & (Omit<ClientPluginOptions, 'onClientInitialized' | 'onSpacesReady'> & Pick<StoryPluginOptions, 'onChatCreated'>);

/**
 * Builds the full plugin list for the plugin manager.
 */
const buildPluginManagerOptions = ({
  types = [],
  plugins = [],
  accessTokens = [],
  onInit,
  onChatCreated,
  ...props
}: Omit<DecoratorsProps, 'lazyPlugins'>): WithPluginManagerOptions => ({
  plugins: [
    ...corePlugins(),
    ClientPlugin({
      types: [
        AccessToken.AccessToken,
        Assistant.Chat,
        Blueprint.Blueprint,
        Operation.PersistentOperation,
        Markdown.Document,
        Prompt.Prompt,
        Trigger.Trigger,
        ...types,
      ],
      onClientInitialized: ({ client }) =>
        Effect.gen(function* () {
          log.info('onClientInitialized', { identity: client.halo.identity.get()?.did });
          // Abort if already initialized.
          if (client.halo.identity.get()) {
            return;
          }

          yield* Effect.promise(() => client.halo.createIdentity());

          const space = yield* Effect.promise(() => client.spaces.create());
          yield* Effect.promise(() => space.waitUntilReady());

          // Add tokens.
          for (const accessToken of accessTokens) {
            space.db.add(Obj.clone(accessToken));
          }

          yield* Effect.promise(() => space.db.flush({ indexes: true }));
          if (onInit) {
            yield* Effect.promise(() => onInit({ client, space }));
          }
          yield* Effect.promise(() => space.db.flush({ indexes: true }));
        }),
      // Directly importing the "@dxos/client/opfs-worker" didn't work.
      createOpfsWorker: props.config?.values.runtime?.client?.storage?.persistent
        ? () => new Worker(new URL('./opfs-worker', import.meta.url), { type: 'module' })
        : undefined,
      ...props,
    }),

    // User plugins.
    PreviewPlugin(),
    AutomationPlugin(),
    AssistantPlugin(),

    // Test-specific.
    StorybookPlugin({}),
    StoryPlugin({ onChatCreated }),
    ...plugins,
  ],
});

/**
 * Inner component that creates the plugin manager and renders the app.
 * Separated to respect React hooks rules (hooks must be called unconditionally).
 */
const PluginManagerHost = ({
  options,
  children,
  contextId,
}: {
  options: WithPluginManagerOptions;
  children: ReactNode;
  contextId: string;
}) => {
  const manager = useMemo(() => {
    const pluginManager = PluginManager.make({
      pluginLoader: () => Effect.die(new Error('Not implemented')),
      plugins: options.plugins ?? [],
      core: (options.plugins ?? []).map(({ meta }) => meta.id),
    });
    return pluginManager;
  }, [options]);

  useEffect(() => {
    const capability = Capability.contributes(Capabilities.ReactRoot, {
      id: contextId,
      root: () => <>{children}</>,
    });

    manager.capabilities.contribute({
      ...capability,
      module: 'org.dxos.app-framework.with-plugin-manager.lazy',
    });

    return () => {
      manager.capabilities.remove(capability.interface, capability.implementation);
      void runAndForwardErrors(manager.shutdown());
    };
  }, [manager, contextId, children]);

  const App = useApp({ pluginManager: manager });
  return <App />;
};

/**
 * Create storybook decorators.
 * Supports lazy plugin loading via the `lazyPlugins` option.
 */
export const getDecorators = ({ lazyPlugins, ...props }: DecoratorsProps) => {
  if (lazyPlugins) {
    return [
      ((Story: FC, context: { id: string }) => {
        const [lazyResult, setLazyResult] = useState<LazyPluginsResult | null>(null);

        useEffect(() => {
          void lazyPlugins().then(setLazyResult);
        }, []);

        const options = useMemo(
          () =>
            lazyResult
              ? buildPluginManagerOptions({
                  ...props,
                  plugins: lazyResult.plugins,
                  types: [...(props.types ?? []), ...(lazyResult.types ?? [])],
                })
              : null,
          [lazyResult],
        );

        if (!options) {
          return null;
        }

        return (
          <PluginManagerHost options={options} contextId={context.id}>
            <Story />
          </PluginManagerHost>
        );
      }) as any,
    ];
  }

  return [withPluginManager(buildPluginManagerOptions(props))];
};

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
    activatesOn: AppActivationEvents.SetupArtifactDefinition,
    activate: () =>
      Effect.succeed([
        // TODO(burdon): Needs attention!!!
        Capability.contributes(AppCapabilities.BlueprintDefinition, MarkdownBlueprint),
        Capability.contributes(AppCapabilities.BlueprintDefinition, DesignBlueprint),
        Capability.contributes(AppCapabilities.BlueprintDefinition, PlanningBlueprint),
        Capability.contributes(Capabilities.OperationHandler, MarkdownHandlers),
        Capability.contributes(Capabilities.OperationHandler, PlanningHandlers),
        Capability.contributes(Capabilities.OperationHandler, AgentHandlers),
        Capability.contributes(Capabilities.OperationHandler, ExampleHandlers),
      ]),
  }),
  Plugin.addModule({
    id: 'example.com/plugin/testing/module/setup',
    activatesOn: ActivationEvent.allOf(ActivationEvents.OperationInvokerReady, ClientEvents.SpacesReady),
    activate: Effect.fnUntraced(function* () {
      const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get()[0];
      invariant(space, 'No space available after initialization.');

      // Ensure workspace is set.
      yield* invoke(LayoutOperation.SwitchWorkspace, { subject: getSpacePath(space.id) });

      // Create initial chat.
      yield* invoke(AssistantOperation.CreateChat, { db: space.db });
    }),
  }),
  Plugin.addModule(({ onChatCreated }) => ({
    id: 'example.com/plugin/testing/module/operation-handler',
    activatesOn: ActivationEvents.SetupOperationHandler,
    activate: Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      return Capability.contributes(
        Capabilities.OperationHandler,
        OperationHandlerSet.make(
          Operation.withHandler(DeckOperation.ChangeCompanion, () => Effect.void),
          Operation.withHandler(AssistantOperation.CreateChat, ({ db, name }) =>
            Effect.gen(function* () {
              const registry = yield* Capability.get(Capabilities.AtomRegistry);
              const space = client.spaces.get(db.spaceId);
              invariant(space, 'Space not found');

              const queue = space.queues.create();
              const chat = Obj.make(Assistant.Chat, {
                name,
                queue: Ref.fromDXN(queue.dxn),
              });
              const binder = new AiContextBinder({ queue, registry });

              // Story-specific behaviour to allow chat creation to be extended.
              space.db.add(chat);
              yield* Effect.tryPromise(() => space.db.flush({ indexes: true }));

              if (onChatCreated) {
                yield* Effect.tryPromise(() => binder.open());
                yield* Effect.tryPromise(() => onChatCreated({ space, chat, binder }));
                yield* Effect.tryPromise(() => binder.close());
              }

              return {
                object: chat,
              };
            }),
          ),
        ),
      );
    }),
  })),
  Plugin.make,
);
