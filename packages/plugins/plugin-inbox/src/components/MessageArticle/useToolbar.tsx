//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Signal } from '@preact/signals-react';
import { useMemo } from 'react';

import {
  atomFromSignal,
  createGapSeparator,
  createMenuAction,
  createMenuItemGroup,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { meta } from '../../meta';

export type ViewMode = 'plain' | 'enriched' | 'plain-only';

export type UseMessageToolbarActionsProps = {
  viewMode: Signal<ViewMode>;
};

export const useMessageToolbarActions = ({ viewMode }: UseMessageToolbarActionsProps) => {
  const creator = useMemo(
    () =>
      Atom.make((get) =>
        get(
          atomFromSignal(() => {
            // TODO(burdon): Chainable builder pattern.
            const nodes = [];
            const edges = [];

            {
              nodes.push(
                createMenuItemGroup('root', {
                  label: ['mailbox toolbar label', { ns: meta.id }],
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
                  viewMode.value = viewMode.value === 'plain' ? 'enriched' : 'plain';
                },
                {
                  label: [
                    viewMode.value === 'plain'
                      ? 'mailbox toolbar show enriched message'
                      : viewMode.value === 'enriched'
                        ? 'mailbox toolbar show plain message'
                        : 'mailbox toolbar enriched message not available',
                    { ns: meta.id },
                  ],
                  icon: viewMode.value === 'enriched' ? 'ph--article--regular' : 'ph--graph--regular',
                },
              );
              nodes.push(action);
              edges.push({ source: 'root', target: action.id });
            }

            return { nodes, edges };
          }),
        ),
      ),
    [viewMode],
  );

  return useMenuActions(creator);
};
