//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Ref } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Segment, Trip } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const selectionManager = yield* Capability.get(AttentionCapabilities.Selection);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const state = get(selectionManager.state);
        const selection = state.selections[nodeId];
        return selection?.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extension = yield* GraphBuilder.createExtension({
      id: 'tripSegment',
      match: (node) => (Trip.instanceOf(node.data) ? Option.some({ trip: node.data, nodeId: node.id }) : Option.none()),
      connector: (matched, get) => {
        const trip = matched.trip;
        const segmentId = get(selectedId(matched.nodeId));
        let segment: Segment.Segment | undefined;
        if (segmentId) {
          for (const ref of trip.segments ?? []) {
            const target = Ref.isRef(ref) ? ref.target : (ref as unknown as Segment.Segment | undefined);
            if (Segment.instanceOf(target) && target.id === segmentId) {
              segment = target;
              break;
            }
          }
        }
        return Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('segment'),
            label: ['segment.companion.label', { ns: meta.id }],
            icon: 'ph--ticket--regular',
            data: segment ?? 'segment',
          }),
        ]);
      },
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, [extension]);
  }),
);
