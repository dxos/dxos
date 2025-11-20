//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import {
  atomFromSignal,
  createGapSeparator,
  createMenuAction,
  createMenuItemGroup,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { meta } from '../../meta';

export type UseEventToolbarActionsProps = {
  onNoteCreate?: () => void;
};

export const useEventToolbarActions = ({ onNoteCreate }: UseEventToolbarActionsProps) => {
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
                  label: ['event toolbar label', { ns: meta.id }],
                }),
              );
            }

            {
              const action = createMenuAction(
                'createNote',
                () => {
                  onNoteCreate?.();
                },
                {
                  label: ['event toolbar create note menu', { ns: meta.id }],
                  icon: 'ph--note--regular',
                },
              );
              nodes.push(action);
              edges.push({ source: 'root', target: action.id });
            }

            const gap = createGapSeparator();
            nodes.push(gap.nodes[0]);
            edges.push({ source: 'root', target: gap.nodes[0].id });

            return { nodes, edges };
          }),
        ),
      ),
    [],
  );

  return useMenuActions(creator);
};
