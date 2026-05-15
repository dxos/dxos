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

      // Plank companion: contributes a "description" panel for every ECHO
      // object article. The panel surface (`description-companion` in
      // react-surface) renders the owning plugin's `meta.description`.
      GraphBuilder.createExtension({
        id: 'description-companion',
        match: NodeMatcher.whenEchoObject,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'description',
              label: ['description-companion.label', { ns: meta.id }],
              icon: 'ph--info--regular',
              data: 'description',
              position: 'fallback',
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
