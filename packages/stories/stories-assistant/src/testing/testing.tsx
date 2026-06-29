//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
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
import { type WithPluginManagerOptions, withPluginManager } from '@dxos/app-framework/testing';
import { useApp } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import {
  Agent,
  AgentHandlers,
  AgentSkill,
  Chat,
  DelegationHandlers,
  DelegationSkill,
  Plan,
  PlanningHandlers,
  PlanningSkill,
} from '@dxos/assistant-toolkit';
import { type Space } from '@dxos/client/echo';
import { Instructions, Operation, OperationHandlerSet, ServiceResolver, Skill, Trigger } from '@dxos/compute';
import { ExampleHandlers } from '@dxos/compute/testing';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Assistant, AssistantOperation } from '@dxos/plugin-assistant';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { ClientCapabilities, ClientEvents, type ClientPluginOptions } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { Markdown, MarkdownSkill } from '@dxos/plugin-markdown';
import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/plugin';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
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
} & (Omit<ClientPluginOptions, 'onClientInitialized' | 'onSpacesReady'> &
  Pick<StoryPluginOptions, 'onChatCreated' | 'createAgent'>);

/**
 * Builds the full plugin list for the plugin manager.
 */
const buildPluginManagerOptions = ({
  types = [],
  plugins = [],
  accessTokens = [],
  onInit,
  onChatCreated,
  createAgent,
  ...props
}: Omit<DecoratorsProps, 'lazyPlugins'>): WithPluginManagerOptions => ({
  // Fire SetupSettings so plugins (e.g. AssistantPlugin) contribute their settings capabilities,
  // which surfaces such as the TracePanel read via `useAtomCapability(AssistantCapabilities.Settings)`.
  setupEvents: [AppActivationEvents.SetupSettings],
  plugins: [
    ...corePlugins(),
    ClientPlugin({
      types: [
        AccessToken.AccessToken,
        Assistant.Chat,
        Plan.Plan,
        Skill.Skill,
        Operation.PersistentOperation,
        Markdown.Document,
        Instructions.Instructions,
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
    RoutinePlugin(),
    AssistantPlugin(),

    // Test-specific.
    StorybookPlugin({}),
    StoryPlugin({ onChatCreated, createAgent }),
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
      enabled: (options.plugins ?? []).map(({ meta }) => meta.profile.key),
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
      void EffectEx.runAndForwardErrors(manager.shutdown());
    };
  }, [manager, contextId, children]);

  // Forward `setupEvents` (e.g. SetupSettings) so plugins contribute their settings capabilities;
  // `useApp` is what fires them, and without this the lazy path skips them (the non-lazy
  // `withPluginManager` path forwards them automatically).
  const App = useApp({ pluginManager: manager, setupEvents: options.setupEvents });
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

type CreateAgentOptions = {
  name?: string;
  instructions?: string;
};

type StoryPluginOptions = {
  onChatCreated?: (props: { space: Space; chat: Assistant.Chat; binder: AiContext.Binder }) => Promise<void>;

  /**
   * If set, the story creates an Agent (with its own Chat) instead of a standalone Chat.
   * Accepts `true` for defaults, or an options object for name/instructions.
   */
  createAgent?: boolean | CreateAgentOptions;
};

const StoryPlugin = Plugin.define<StoryPluginOptions>(
  Plugin.makeMeta({
    key: DXN.make('com.example.plugin.testing'),
    name: 'Testing',
  }),
).pipe(
  Plugin.addModule({
    id: 'com.example.plugin.testing.module.testing',
    activatesOn: AppActivationEvents.SetupArtifactDefinition,
    activate: () =>
      Effect.succeed([
        // TODO(burdon): Clean up.
        Capability.contributes(AppCapabilities.SkillDefinition, MarkdownSkill),
        Capability.contributes(AppCapabilities.SkillDefinition, PlanningSkill),
        Capability.contributes(AppCapabilities.SkillDefinition, DelegationSkill),
        Capability.contributes(Capabilities.OperationHandler, MarkdownOperationHandlerSet),
        Capability.contributes(Capabilities.OperationHandler, PlanningHandlers),
        Capability.contributes(Capabilities.OperationHandler, DelegationHandlers),
        Capability.contributes(Capabilities.OperationHandler, AgentHandlers),
        Capability.contributes(Capabilities.OperationHandler, ExampleHandlers),
      ]),
  }),
  Plugin.addModule(({ createAgent, onChatCreated }) => ({
    id: 'com.example.plugin.testing.module.setup',
    activatesOn: ActivationEvent.allOf(ActivationEvents.ProcessManagerReady, ClientEvents.SpacesReady),
    activate: Effect.fnUntraced(function* () {
      const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get()[0];
      invariant(space, 'No space available after initialization.');

      // Ensure workspace is set. NOTE: the active workspace that surfaces read via
      // `useActiveSpace()` is set from the React tree in `ModuleContainer` (the plugin-module
      // activation context resolves a different AtomRegistry than the UI).
      yield* invoke(LayoutOperation.SwitchWorkspace, { subject: Paths.getSpacePath(space.id) });

      // Create agent.
      if (createAgent) {
        const agentOptions = typeof createAgent === 'object' ? createAgent : {};
        const agent = yield* Agent.makeInitialized(
          {
            name: agentOptions.name ?? 'Default',
            instructions: agentOptions.instructions ?? '',
          },
          AgentSkill.make(),
        ).pipe(
          Effect.provide(
            ServiceResolver.provide({ space: space.id }, Database.Service).pipe(
              Layer.provide(Capability.asLayer(Capabilities.ServiceResolver, ServiceResolver.ServiceResolver)),
            ),
          ),
        );
        yield* Effect.tryPromise(() => space.db.flush({ indexes: true }));

        if (onChatCreated) {
          const registry = yield* Capability.get(Capabilities.AtomRegistry);
          const chat = yield* Effect.promise(() => agent.chat!.load());
          const feed = yield* Effect.promise(() => chat.feed.load());
          const runtime = yield* Effect.runtime<Database.Service>().pipe(Effect.provide(Database.layer(space.db)));
          const binder = new AiContext.Binder({ feed, runtime, registry });
          yield* Effect.tryPromise(() => binder.open());
          yield* Effect.tryPromise(() => onChatCreated({ space, chat, binder }));
          yield* Effect.tryPromise(() => binder.close());
        }
      } else {
        // Create initial chat.
        yield* invoke(AssistantOperation.CreateChat, { db: space.db });
      }
    }),
  })),
  Plugin.addModule(({ onChatCreated }) => ({
    id: 'com.example.plugin.testing.module.operationHandler',
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(
        Capabilities.OperationHandler,
        OperationHandlerSet.make(
          Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void),
          Operation.withHandler(AssistantOperation.CreateChat, ({ db, name }) =>
            Effect.gen(function* () {
              // Resolve the client lazily at invocation time: the `Client` capability is
              // contributed on `Startup` (concurrently with `SetupProcessManager`), so it is
              // not guaranteed to exist when this module activates.
              const client = yield* Capability.get(ClientCapabilities.Client);
              const registry = yield* Capability.get(Capabilities.AtomRegistry);
              const space = client.spaces.get(db.spaceId);
              invariant(space, 'Space not found');

              const feed = space.db.add(Feed.make());
              const chat = Chat.make({ name, feed: Ref.make(feed) });
              Obj.setParent(feed, chat);
              const runtime = yield* Effect.runtime<Database.Service>().pipe(Effect.provide(Database.layer(space.db)));
              const binder = new AiContext.Binder({ feed, runtime, registry });

              space.db.add(chat);
              yield* Effect.tryPromise(() => space.db.flush({ indexes: true }));

              yield* Effect.tryPromise(() => binder.open());
              yield* Effect.tryPromise(() => binder.bind({ objects: [Ref.make(chat)] }));

              if (onChatCreated) {
                yield* Effect.tryPromise(() => onChatCreated({ space, chat, binder }));
              }

              yield* Effect.tryPromise(() => binder.close());

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
