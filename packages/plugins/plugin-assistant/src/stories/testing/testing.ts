//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, IntentPlugin, type Plugin, SettingsPlugin, contributes } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AiContextBinder } from '@dxos/assistant';
import {
  DESIGN_BLUEPRINT,
  PLANNING_BLUEPRINT,
  RESEARCH_BLUEPRINT,
  readDocument,
  readTasks,
  remoteServiceEndpoints,
  research,
  updateDocument,
  updateTasks,
} from '@dxos/assistant-testing';
import { Blueprint } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { type ClientPluginOptions } from '@dxos/plugin-client/types';
import { GraphPlugin } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown/types';
import { SpacePlugin } from '@dxos/plugin-space';
import { Config } from '@dxos/react-client';
import type { DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

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
          // TODO(burdon): Normalize props ('url'?)
          server: remoteServiceEndpoints.ai,
        },
        edge: {
          url: remoteServiceEndpoints.edge,
        },
      },
    },
  }),
};

type DecoratorsProps = Omit<ClientPluginOptions, 'onClientInitialized' | 'onSpacesReady'> & {
  plugins?: Plugin[];
  blueprints?: Blueprint.Blueprint[];
  accessTokens?: DataType.AccessToken[];
  onInit?: (props: { space: Space; chat: Assistant.Chat; binder: AiContextBinder }) => Promise<void>;
};

/**
 * Create storybook decorators.
 */
export const getDecorators = ({
  types = [],
  plugins = [],
  blueprints = [],
  accessTokens = [],
  onInit,
  ...props
}: DecoratorsProps) => [
  withPluginManager({
    fireEvents: [Events.SetupArtifactDefinition],
    plugins: [
      // System plugins.
      AttentionPlugin(),
      GraphPlugin(),
      IntentPlugin(),
      SettingsPlugin(),
      SpacePlugin(),
      ClientPlugin({
        types: [Markdown.Document, Assistant.Chat, Blueprint.Blueprint, ...types],
        onClientInitialized: async ({ client }) => {
          log.info('onClientInitialized', { identity: client.halo.identity.get()?.did });
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

          for (const accessToken of accessTokens) {
            space.db.add(Obj.clone(accessToken));
          }
          await space.db.flush({ indexes: true });

          // TODO(burdon): Get blueprints from capabilities. Reconcile with useBlueprints.
          // Clone blueprints and bind to conversation.
          const chat = space.db.add(Obj.make(Assistant.Chat, { queue: Ref.fromDXN(space.queues.create().dxn) }));
          const binder = new AiContextBinder(await chat.queue.load());
          for (const blueprint of blueprints) {
            const obj = space.db.add(Obj.clone(blueprint));
            await binder.bind({ blueprints: [Ref.make(obj)] });
          }
          await space.db.flush({ indexes: true });

          await onInit?.({ space, chat, binder });
        },
        ...props,
      }),

      // User plugins.
      AssistantPlugin(),
      ...plugins,
    ],
    capabilities: [
      // TOOD(burdon): Factor out to testing plugins.
      contributes(Capabilities.BlueprintDefinition, DESIGN_BLUEPRINT),
      contributes(Capabilities.BlueprintDefinition, PLANNING_BLUEPRINT),
      contributes(Capabilities.BlueprintDefinition, RESEARCH_BLUEPRINT),
      contributes(Capabilities.Functions, [readDocument, updateDocument]),
      contributes(Capabilities.Functions, [readTasks, updateTasks]),
      contributes(Capabilities.Functions, [research]),
    ],
  }),
  withTheme,
  withLayout({
    fullscreen: true,
    classNames: 'bg-deckSurface justify-center',
  }),
];
