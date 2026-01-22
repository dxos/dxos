//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { createGapSeparator, createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';

import { meta } from '../../meta';

export type ViewMode = 'plain' | 'enriched' | 'plain-only';

export type UseMessageToolbarActionsProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

export const useMessageToolbarActions = ({ viewMode, setViewMode }: UseMessageToolbarActionsProps) => {
  const creator = useMemo(
    () =>
      Atom.make(() => {
        // TODO(burdon): Chainable builder pattern.
        const nodes = [];
        const edges = [];

        {
          nodes.push(
            createMenuItemGroup('root', {
              label: ['message toolbar label', { ns: meta.id }],
            }),
          );
        }

        const gap = createGapSeparator();
        nodes.push(gap.nodes[0]);
        edges.push({ source: 'root', target: gap.nodes[0].id });

        {
          const action = createMenuAction(
            'viewMode',
            () => {
              setViewMode(viewMode === 'plain' ? 'enriched' : 'plain');
            },
            {
              label: [
                viewMode === 'plain'
                  ? 'message toolbar show enriched message'
                  : viewMode === 'enriched'
                    ? 'message toolbar show plain message'
                    : 'message toolbar enriched message not available',
                { ns: meta.id },
              ],
              icon: viewMode === 'enriched' ? 'ph--article--regular' : 'ph--graph--regular',
            },
          );
          nodes.push(action);
          edges.push({ source: 'root', target: action.id });
        }

        return { nodes, edges };
      }),
    [viewMode, setViewMode],
  );

  return useMenuActions(creator);
};
