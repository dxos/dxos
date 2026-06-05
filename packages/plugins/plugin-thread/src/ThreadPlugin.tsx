//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';
import { AnchoredTo, Channel, Message, Thread } from '@dxos/types';

import {
  AgentRunner,
  AppGraphBuilder,
  BlueprintDefinition,
  ChannelBackendFeed,
  CreateObject,
  Markdown,
  OperationHandler,
  UndoMappings,
  ReactSurface,
  ThreadState,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { AgentIdentity, DEFAULT_AGENT_IDENTITY, ThreadOperation } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

// TODO(Zan): Every instance of `cursor` should be replaced with `anchor`.
//  NOTE(burdon): Review/discuss CursorConverter semantics.

// TODO(wittjosiah): Rename to ChatPlugin.
// TODO(wittjosiah): Enabling comments should likely be factored out of this plugin but depend on it's capabilities.

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  // Default local-feed channel backend. Other plugins contribute additional
  // `ChannelBackend` providers (e.g. ATProto) earlier in plugin order.
  Plugin.addModule({
    id: 'channel-backend-feed',
    activatesOn: ActivationEvents.Startup,
    activate: ChannelBackendFeed,
  }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Channel.Channel, Message.Message, Thread.Thread],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...threadTranslations] }),
  // TODO(wittjosiah): Currently not used but leaving because there will likely be settings for threads again.
  // Plugin.addModule({
  //   id: 'settings',
  //   activatesOn: Events.SetupSettings,
  //   activate: ThreadSettings,
  // }),
  Plugin.addModule({
    id: 'state',
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: AppActivationEvents.SetupSettings,
    activate: ThreadState,
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(ThreadOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  // Default comment-thread agent runner (one-shot LLM call per scheduled turn).
  // Test/storybook hosts that contribute a stub `AgentRunner` earlier in plugin
  // order — i.e. before ThreadPlugin in the plugins list — win, because
  // `Capability.get` returns the first contribution.
  Plugin.addModule({
    id: 'agent-runner',
    activatesOn: ActivationEvents.Startup,
    activate: AgentRunner,
  }),
  // Default agent identity. Hosts wanting a different name contribute their own
  // `AgentIdentity` earlier in plugin order to win the `Capability.get`.
  Plugin.addModule({
    id: 'agent-identity',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(AgentIdentity, DEFAULT_AGENT_IDENTITY)),
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default ThreadPlugin;
