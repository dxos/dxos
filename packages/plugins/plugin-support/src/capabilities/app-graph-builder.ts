//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/app-graph';
import { AppCapabilities, AppNodeMatcher, LayoutOperation, isPersonalSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { meta } from '#meta';
import { HelpCapabilities, HelpOperation } from '#types';

import { SHORTCUTS_DIALOG, WELCOME_ID, WELCOME_TYPE } from '../constants';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
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

      // Personal-space-only Welcome virtual node, hoisted to the top of the navtree.
      GraphBuilder.createExtension({
        id: 'welcome',
        match: AppNodeMatcher.whenSpace,
        connector: (space) =>
          Effect.succeed(
            isPersonalSpace(space)
              ? [
                  Node.make({
                    id: WELCOME_ID,
                    type: WELCOME_TYPE,
                    data: WELCOME_ID,
                    properties: {
                      label: ['welcome-node.label', { ns: meta.id }],
                      icon: 'ph--lifebuoy--regular',
                      iconHue: 'rose',
                      position: 'hoist',
                      draggable: false,
                      droppable: false,
                    },
                  }),
                ]
              : [],
          ),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
