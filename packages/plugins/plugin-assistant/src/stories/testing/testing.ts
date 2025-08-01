//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, Events, IntentPlugin, type Plugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ContextBinder } from '@dxos/assistant';
import { readDocument, remoteServiceEndpoints, updateDocument } from '@dxos/assistant-testing';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { type ClientPluginOptions } from '@dxos/plugin-client/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { SpacePlugin } from '@dxos/plugin-space';
import { TranscriptionPlugin } from '@dxos/plugin-transcription';
import { Config } from '@dxos/react-client';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { AssistantPlugin } from '../../AssistantPlugin';
import { Assistant } from '../../types';

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

/**
 * Create storybook decorators.
 */
export const getDecorators = ({
  plugins = [],
  blueprints = [],
  context = false,
  config,
  types = [],
  ...props
}: {
  config: Config;
  plugins?: Plugin[];
  blueprints?: Blueprint.Blueprint[];
  context?: boolean;
} & Omit<ClientPluginOptions, 'onClientInitialized'>) => [
  withPluginManager({
    fireEvents: [Events.SetupArtifactDefinition],
    plugins: [
      ClientPlugin({
        config,
        types: [Markdown.Document, Assistant.Chat, Blueprint.Blueprint, ...types],
        onClientInitialized: async (context, client) => {
          await client.halo.createIdentity();
          await client.spaces.waitUntilReady();

          const space = client.spaces.default;
          // ISSUE(burdon): Should not require this.
          //  ERROR: invariant violation: Database was not initialized with root object.
          await space.waitUntilReady();

          // TODO(burdon): Assistant.makeChat()
          const chat = space.db.add(Obj.make(Assistant.Chat, { queue: Ref.fromDXN(space.queues.create().dxn) }));
          const binder = new ContextBinder(await chat.queue.load());

          // TODO(burdon): Remove (should be created by blueprint).
          const doc = space.db.add(Markdown.makeDocument({ name: 'Tasks' }));
          if (context) {
            await binder.bind({ objects: [Ref.make(doc)] });
          }

          // Clone blueprints and bind to conversation.
          // TODO(dmaretskyi): This should be done by Obj.clone.
          for (const blueprint of blueprints) {
            const { id: _id, ...data } = blueprint;
            const obj = space.db.add(Obj.make(Blueprint.Blueprint, data));
            await binder.bind({ blueprints: [Ref.make(obj)] });
          }

          await props.onSpacesReady?.(context, client);
        },
        // TODO(burdon): This isn't called?
        // onSpacesReady: async (_, client) => {
        //   const space = client.spaces.default;
        //   space.db.add(Board.makeBoard());
        // },
        ...props,
      }),
      IntentPlugin(),
      SettingsPlugin(),
      SpacePlugin(),

      TranscriptionPlugin(),
      AssistantPlugin(),

      ...plugins,
    ],
    capabilities: [contributes(Capabilities.Functions, [readDocument, updateDocument])],
  }),
  withTheme,
  withLayout({
    fullscreen: true,
    classNames: 'bg-deckSurface justify-center',
  }),
];
