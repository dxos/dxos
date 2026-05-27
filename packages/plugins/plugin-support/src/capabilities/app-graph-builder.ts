//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/app-graph';
import { AppCapabilities, AppNode, AppNodeMatcher, LayoutOperation, isPersonalSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { HelpCapabilities, HelpOperation, SupportCapabilities } from '#types';

import { SHORTCUTS_DIALOG, WELCOME_NODE_ID, WELCOME_NODE_TYPE } from '../constants';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const extensions = yield* Effect.all([
      // Root actions: open welcome tour + open shortcuts.
      GraphBuilder.createExtension({
        id: DXN.make('org.dxos.plugin.support.extension.root'),
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            Node.makeAction({
              id: HelpOperation.Start.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Capabilities.updateAtomValue(HelpCapabilities.State, (s) => ({ ...s, showHints: true }));
                yield* Operation.invoke(HelpOperation.Start);
              }),
              properties: {
                label: ['open-help-tour.message', { ns: meta.id }],
                icon: 'ph--info--regular',
                keyBinding: {
                  macos: 'shift+meta+/',
                  windows: 'shift+ctrl+/',
                  linux: 'shift+ctrl+?',
                },
                testId: 'helpPlugin.openHelp',
              },
            }),
            Node.makeAction({
              id: 'open-shortcuts',
              data: Effect.fnUntraced(function* () {
                yield* Capabilities.updateAtomValue(HelpCapabilities.State, (s) => ({ ...s, showHints: true }));
                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: SHORTCUTS_DIALOG,
                });
              }),
              properties: {
                label: ['open-shortcuts.label', { ns: meta.id }],
                icon: 'ph--keyboard--regular',
                keyBinding: {
                  macos: 'meta+ctrl+/',
                },
              },
            }),
          ]),
      }),

      // Plank companion: contributes a "Help" panel for every ECHO object
      // article. The panel surface (`help-companion` in react-surface)
      // renders the owning plugin's `meta.description`.
      GraphBuilder.createExtension({
        id: DXN.make('org.dxos.plugin.support.extension.helpCompanion'),
        match: NodeMatcher.whenEchoObject,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'help',
              label: ['help-companion.label', { ns: meta.id }],
              icon: 'ph--info--regular',
              data: 'help',
              position: 'last',
            }),
          ]),
      }),

      // Deck companion: feedback / help tab in the complementary sidebar (R1).
      // Renders the FeedbackPanel via the `deck-companion--help` surface.
      GraphBuilder.createExtension({
        id: DXN.make('org.dxos.plugin.support.extension.help'),
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: linkedSegment('help'),
              label: ['help.label', { ns: meta.id }],
              icon: 'ph--megaphone--regular',
              data: null,
              position: 'first',
              joyride: 'welcome/feedback',
            }),
          ]),
      }),

      // Deck companion: Discord community tab in the complementary sidebar (R1).
      // Renders the Discord widget iframe via the `deck-companion--discord` surface.
      GraphBuilder.createExtension({
        id: DXN.make('org.dxos.plugin.support.extension.discord'),
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: linkedSegment('discord'),
              label: ['discord.label', { ns: meta.id }],
              icon: 'ph--discord-logo--regular',
              data: null,
              position: 'first',
            }),
          ]),
      }),

      // Personal-space-only Welcome virtual node, hoisted to the top of the navtree.
      // The node is fully virtual (no backing ECHO object); the matching Article surface
      // is selected via the `welcome` literal subject. Gated by the `showWelcome` setting.
      // The extension itself is positioned `first` so its node is inserted ahead of other
      // `position: 'first'` siblings (Settings, Collections) under the personal space.
      GraphBuilder.createExtension({
        id: DXN.make('org.dxos.plugin.support.extension.welcome'),
        position: 'first',
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          if (!isPersonalSpace(space)) {
            return Effect.succeed([]);
          }

          // Settings atom may not be contributed yet on first render — default to "show".
          const settingsAtom = capabilities.get(SupportCapabilities.Settings);
          if (settingsAtom && !get(settingsAtom).showWelcome) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              id: WELCOME_NODE_ID,
              type: WELCOME_NODE_TYPE,
              data: WELCOME_NODE_ID,
              properties: {
                label: ['welcome-node.label', { ns: meta.id }],
                icon: 'ph--lifebuoy--regular',
                iconHue: 'rose',
                position: 'first',
                draggable: false,
                droppable: false,
              },
            } satisfies Node.NodeArg<string>,
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
