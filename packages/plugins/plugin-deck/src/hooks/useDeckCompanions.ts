//
// Copyright 2025 DXOS.org
//

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import type * as AppNode from '@dxos/app-toolkit/AppNode';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import * as GraphNode from '@dxos/graph/GraphNode';
import { useConnections } from '@dxos/plugin-graph/hooks';
import { type Label } from '@dxos/ui-types/translations';
import { Position } from '@dxos/util';

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

export const useDeckCompanions = (): DeckCompanion[] => {
  const { graph } = useAppGraph();
  const companions = useConnections(graph, GraphNode.RootId, AppGraphNode.companionRelation()) as DeckCompanion[];
  return companions.toSorted((a, b) => Position.compare(a.properties, b.properties));
};
