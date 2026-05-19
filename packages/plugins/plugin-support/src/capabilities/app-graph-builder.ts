//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/app-graph';
import { AppCapabilities, AppNode, AppNodeMatcher, LayoutOperation, isPersonalSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Filter, Obj } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { log } from '@dxos/log';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { HelpCapabilities, HelpOperation, Support, SupportCapabilities } from '#types';

import { SHORTCUTS_DIALOG } from '../constants';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const extensions = yield* Effect.all([
      // Root actions: open welcome tour + open shortcuts.
      GraphBuilder.createExtension({
        id: 'root',
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
        id: 'help-companion',
        match: NodeMatcher.whenEchoObject,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'help',
              label: ['help-companion.label', { ns: meta.id }],
              icon: 'ph--info--regular',
              data: 'help',
              position: 'fallback',
            }),
          ]),
      }),

      // Deck companion: feedback / help tab in the complementary sidebar (R1).
      // Renders the FeedbackPanel via the `deck-companion--help` surface.
      GraphBuilder.createExtension({
        id: 'help',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: linkedSegment('help'),
              label: ['help.label', { ns: meta.id }],
              icon: 'ph--question--regular',
              data: null,
              position: 'hoist',
              joyride: 'welcome/feedback',
            }),
          ]),
      }),

      // Deck companion: Discord community tab in the complementary sidebar (R1).
      // Renders the Discord widget iframe via the `deck-companion--discord` surface.
      GraphBuilder.createExtension({
        id: 'discord',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: linkedSegment('discord'),
              label: ['discord.label', { ns: meta.id }],
              icon: 'ph--discord-logo--regular',
              data: null,
              position: 'hoist',
            }),
          ]),
      }),

      // Deck companion: GitHub recent PRs tab in the complementary sidebar (R1).
      // Renders the GithubPanel via the `deck-companion--github` surface.
      GraphBuilder.createExtension({
        id: 'github',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: linkedSegment('github'),
              label: ['github.label', { ns: meta.id }],
              icon: 'ph--github-logo--regular',
              data: null,
              position: 'hoist',
            }),
          ]),
      }),

      // Personal-space-only Welcome virtual node, hoisted to the top of the navtree.
      // Data is the singleton Welcome ECHO object (provisioned by WelcomeProvisioner),
      // so the assistant plugin's companion-chat extension binds automatically.
      // Gated by the `showWelcome` plugin setting.
      GraphBuilder.createExtension({
        id: 'welcome',
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

          const welcome = get(AtomQuery.make(space.db, Filter.type(Support.Welcome)))[0] as Obj.Unknown | undefined;
          log.info('welcome connector', { hasWelcome: !!welcome, welcomeId: welcome?.id, spaceId: space.id });
          if (!welcome) {
            return Effect.succeed([]);
          }

          // Build a full ECHO object node so the navtree wires up persistence/cache correctly,
          // then layer in welcome-specific presentation.
          const baseNode = AppNode.makeObject({ db: space.db, object: welcome });
          if (!baseNode) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              ...baseNode,
              properties: {
                ...baseNode.properties,
                label: ['welcome-node.label', { ns: meta.id }],
                icon: 'ph--lifebuoy--regular',
                iconHue: 'rose',
                position: 'hoist',
                draggable: false,
                droppable: false,
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
