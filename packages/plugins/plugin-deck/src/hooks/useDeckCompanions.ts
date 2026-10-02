//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { type Label } from '@dxos/ui-types/translations';
import { Position } from '@dxos/util';

import { DeckSchema } from '#types';

export type DeckCompanion = AppGraphNode.Node<
  any,
  {
    label: Label;
    icon: string;
    // TODO(burdon): Scroll area should be controlled by surface.
    /** If true, the panel will not be wrapped in a scroll area. */
    fixed?: boolean;
    position?: Position.Position;
    joyride?: string;
    mount?: AppNode.DeckCompanionMount;
  }
>;

const isDeckCompanion = (node: AppGraphNode.Node): node is DeckCompanion =>
  node.type === DeckSchema.DECK_COMPANION_TYPE;

export const useDeckCompanions = (): DeckCompanion[] => {
  const { graph } = Hooks.useAppGraph();
  useEffect(() => {
    AppGraph.expandSync(graph, GraphNode.RootId, AppNode.companion);
  }, [graph]);

  return GraphHooks.useConnections(graph, GraphNode.RootId, AppNode.companion)
    .filter(isDeckCompanion)
    .toSorted((a, b) => Position.compare(a.properties, b.properties));
};
