//
// Copyright 2025 DXOS.org
//

import { type Label, useAppGraph } from '@dxos/app-framework';
import { type Node, ROOT_ID, useConnections } from '@dxos/plugin-graph';
import { type Position, byPosition } from '@dxos/util';

import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE } from '../types';

export const getCompanionId = (id: string) => {
  const [_, companionId] = id.split(ATTENDABLE_PATH_SEPARATOR);
  return companionId ?? 'never';
};

export type DeckCompanion = Node<
  any,
  {
    label: Label;
    icon: string;
    // TODO(burdon): Scroll area should be controlled by surface.
    /** If true, the panel will not be wrapped in a scroll area. */
    fixed?: boolean;
    position?: Position;
  }
>;

export const useDeckCompanions = (): DeckCompanion[] => {
  const { graph } = useAppGraph();
  const connections = useConnections(graph, ROOT_ID);
  const companions = connections.filter((node) => node.type === DECK_COMPANION_TYPE) as DeckCompanion[];
  return companions.toSorted((a, b) => byPosition(a.properties, b.properties));
};
