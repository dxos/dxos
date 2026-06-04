//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';

import { QUICK_ENTRY_DIALOG, meta } from '#meta';
import { OutlineOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'quickEntry',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            Node.makeAction({
              id: OutlineOperation.QuickJournalEntry.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: QUICK_ENTRY_DIALOG,
                  blockAlign: 'start',
                });
              }),
              properties: {
                label: ['quick-entry.label', { ns: meta.id }],
                icon: 'ph--calendar-plus--regular',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
