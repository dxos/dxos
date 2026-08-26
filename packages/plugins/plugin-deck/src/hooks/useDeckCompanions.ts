//
// Copyright 2025 DXOS.org
//

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import * as GraphNode from '@dxos/graph/GraphNode';
import { useConnections } from '@dxos/plugin-graph/hooks';
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
  }
>;

export const useDeckCompanions = (): DeckCompanion[] => {
  const { graph } = useAppGraph();
  const connections = useConnections(graph, GraphNode.RootId, 'child');
  const companions = connections.filter((node) => node.type === DeckSchema.DECK_COMPANION_TYPE) as DeckCompanion[];
  return companions.toSorted((a, b) => Position.compare(a.properties, b.properties));
};
