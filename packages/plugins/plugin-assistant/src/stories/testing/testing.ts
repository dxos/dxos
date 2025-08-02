//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, Events, IntentPlugin, type Plugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ContextBinder } from '@dxos/assistant';
import {
  DESIGN_BLUEPRINT,
  PLANNING_BLUEPRINT,
  readDocument,
  readTasks,
  remoteServiceEndpoints,
  updateDocument,
  updateTasks,
} from '@dxos/assistant-testing';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { type ClientPluginOptions } from '@dxos/plugin-client/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { SpacePlugin } from '@dxos/plugin-space';
import { Config } from '@dxos/react-client';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { GraphPlugin } from '@dxos/plugin-graph';

import { AssistantPlugin } from '../../AssistantPlugin';
import { Assistant } from '../../types';
import { type Space } from '@dxos/client/echo';

export const remoteConfig = new Config({
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
});

type DecoratorsProps = Omit<ClientPluginOptions, 'onClientInitialized' | 'onSpacesReady'> & {
  plugins?: Plugin[];
  blueprints?: Blueprint.Blueprint[];
  onInit?: (props: { space: Space; chat: Assistant.Chat; binder: ContextBinder }) => Promise<void>;
};

/**
 * Create storybook decorators.
 */
export const getDecorators = ({ types = [], plugins = [], blueprints = [], onInit, ...props }: DecoratorsProps) => [
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
        onClientInitialized: async (context, client) => {
          await client.halo.createIdentity();
          await client.spaces.waitUntilReady();

          const space = client.spaces.default;
          // TODO(burdon): Should not require this.
          //  ERROR: invariant violation: Database was not initialized with root object.
          // TODO(burdon): onSpacesReady is never called.
          await space.waitUntilReady();

          // Clone blueprints and bind to conversation.
          // TODO(dmaretskyi): This should be done by Obj.clone.
          const chat = space.db.add(Obj.make(Assistant.Chat, { queue: Ref.fromDXN(space.queues.create().dxn) }));
          const binder = new ContextBinder(await chat.queue.load());
          for (const blueprint of blueprints) {
            const { id: _id, ...data } = blueprint;
            const obj = space.db.add(Obj.make(Blueprint.Blueprint, data));
            await binder.bind({ blueprints: [Ref.make(obj)] });
          }

          await onInit?.({ space, chat, binder });
        },
        ...props,
      }),

      // User plugins.
      AssistantPlugin(),
      ...plugins,
    ],
    capabilities: [
      // TOOD(burdon): Factor out capability definitions.
      contributes(Capabilities.BlueprintDefinition, DESIGN_BLUEPRINT),
      contributes(Capabilities.BlueprintDefinition, PLANNING_BLUEPRINT),
      contributes(Capabilities.Functions, [readDocument, updateDocument]),
      contributes(Capabilities.Functions, [readTasks, updateTasks]),
    ],
  }),
  withTheme,
  withLayout({
    fullscreen: true,
    classNames: 'bg-deckSurface justify-center',
  }),
];
