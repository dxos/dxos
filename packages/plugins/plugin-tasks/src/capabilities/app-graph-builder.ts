//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { QUICK_ENTRY_DIALOG, meta } from '#meta';
import { OutlineOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'quickEntry',
        match: GraphNodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            AppGraphNode.makeAction({
              id: OutlineOperation.QuickJournalEntry.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: QUICK_ENTRY_DIALOG,
                  blockAlign: 'start',
                });
              }),
              properties: {
                label: ['quick-entry.label', { ns: meta.profile.key }],
                icon: 'ph--calendar-plus--regular',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
