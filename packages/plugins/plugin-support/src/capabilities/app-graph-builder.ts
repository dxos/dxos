//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/app-graph';
import { AppCapabilities, AppNode, AppNodeMatcher, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { HelpCapabilities, HelpOperation, SupportCapabilities } from '#types';

import { SHORTCUTS_DIALOG, SPACE_HOME_NODE_TYPE } from '../constants';

// Graph node/action label tuples. These MUST be module-level singletons: connectors/actions re-evaluate
// whenever their matched node emits, and `addNodeImpl` dedupes properties by reference. A label tuple
// rebuilt inline on every evaluation always compares unequal, so the graph re-emits the node, remounting
// the node's surface (and any cross-origin iframe it hosts) and freezing the app.
type LabelTuple = [string, { ns: string }];
const OPEN_HELP_TOUR_LABEL: LabelTuple = ['open-help-tour.message', { ns: meta.id }];
const OPEN_SHORTCUTS_LABEL: LabelTuple = ['open-shortcuts.label', { ns: meta.id }];
const HELP_COMPANION_LABEL: LabelTuple = ['help-companion.label', { ns: meta.id }];
const HELP_LABEL: LabelTuple = ['help.label', { ns: meta.id }];
const DISCORD_LABEL: LabelTuple = ['discord.label', { ns: meta.id }];
const SPACE_HOME_NODE_LABEL: LabelTuple = ['space-home-node.label', { ns: meta.id }];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const settingsAtom = capabilities.get(SupportCapabilities.Settings);

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
                label: OPEN_HELP_TOUR_LABEL,
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
              id: 'openShortcuts',
              data: Effect.fnUntraced(function* () {
                yield* Capabilities.updateAtomValue(HelpCapabilities.State, (s) => ({ ...s, showHints: true }));
                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: SHORTCUTS_DIALOG,
                });
              }),
              properties: {
                label: OPEN_SHORTCUTS_LABEL,
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
        id: 'helpCompanion',
        match: NodeMatcher.whenEchoObject,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'help',
              label: HELP_COMPANION_LABEL,
              icon: 'ph--info--regular',
              data: 'help',
              position: 'last',
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
              label: HELP_LABEL,
              icon: 'ph--megaphone--regular',
              data: null,
              position: 'first',
              joyride: 'welcome/feedback',
            }),
          ]),
      }),

      // Deck companion: Discord community tab in the complementary sidebar (R1).
      // Renders the Discord widget iframe via the `deck-companion--discord` surface.
      // Hidden by default; toggled via the showDiscordCompanion setting.
      GraphBuilder.createExtension({
        id: 'discord',
        match: NodeMatcher.whenRoot,
        connector: (_root, get) => {
          const settings = get(settingsAtom);
          if (!settings.showDiscordCompanion) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            AppNode.makeDeckCompanion({
              id: linkedSegment('discord'),
              label: DISCORD_LABEL,
              icon: 'ph--discord-logo--regular',
              data: null,
              position: 'first',
            }),
          ]);
        },
      }),

      // Per-space Home virtual node, hoisted to the top of every space's navtree. The node is fully
      // virtual (no backing ECHO object); the matching Article surface uses `useActiveSpace()` to
      // resolve the space. The extension is positioned `first` so its node is inserted ahead of
      // other `position: 'first'` siblings (Settings, Collections).
      GraphBuilder.createExtension({
        id: 'spaceHome',
        position: 'first',
        match: AppNodeMatcher.whenSpace,
        // NOTE: The connector re-evaluates whenever the space node emits (e.g. when the assistant writes
        // feed/queue data). `addNodeImpl` dedupes properties by reference, so the static `properties` and
        // its `label` array MUST be stable singletons — otherwise each re-eval mints a "changed" node,
        // remounting the Home Article surface (and its cross-origin welcome iframe) and freezing the app.
        connector: (space) =>
          Effect.succeed([
            {
              id: Paths.SPACE_HOME_SEGMENT,
              type: SPACE_HOME_NODE_TYPE,
              data: SPACE_HOME_NODE_TYPE,
              properties: {
                label: SPACE_HOME_NODE_LABEL,
                icon: 'ph--house--regular',
                iconHue: 'cyan',
                position: 'first',
                draggable: false,
                droppable: false,
              },
            } satisfies Node.NodeArg<string>,
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
