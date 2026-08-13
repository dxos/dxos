//
// Copyright 2025 DXOS.org
//

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as NodeType from '@dxos/app-graph/AppGraphNode';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useConnections } from '@dxos/plugin-graph/hooks';
import { type Label } from '@dxos/ui-types/translations';
import { Position } from '@dxos/util';

import { DeckSchema } from '#types';

export type DeckCompanion = NodeType.Node<
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
  const connections = useConnections(graph, AppGraphNode.RootId, 'child');
  const companions = connections.filter((node) => node.type === DeckSchema.DECK_COMPANION_TYPE) as DeckCompanion[];
  return companions.toSorted((a, b) => Position.compare(a.properties, b.properties));
};
