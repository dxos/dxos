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
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
};

export const useMessageToolbarActions = ({
  viewMode,
  onReply,
  onReplyAll,
  onForward,
}: UseMessageToolbarActionsProps) => {
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
                  label: ['message toolbar label', { ns: meta.id }],
                }),
              );
            }

            // Reply actions.
            if (onReply) {
              const action = createMenuAction('reply', onReply, {
                label: ['message toolbar reply', { ns: meta.id }],
                icon: 'ph--arrow-bend-up-left--regular',
              });
              nodes.push(action);
              edges.push({ source: 'root', target: action.id });
            }

            if (onReplyAll) {
              const action = createMenuAction('replyAll', onReplyAll, {
                label: ['message toolbar reply all', { ns: meta.id }],
                icon: 'ph--arrow-bend-double-up-left--regular',
              });
              nodes.push(action);
              edges.push({ source: 'root', target: action.id });
            }

            if (onForward) {
              const action = createMenuAction('forward', onForward, {
                label: ['message toolbar forward', { ns: meta.id }],
                icon: 'ph--arrow-bend-up-right--regular',
              });
              nodes.push(action);
              edges.push({ source: 'root', target: action.id });
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
                      ? 'message toolbar show enriched message'
                      : viewMode.value === 'enriched'
                        ? 'message toolbar show plain message'
                        : 'message toolbar enriched message not available',
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
    [viewMode, onReply, onReplyAll, onForward],
  );

  return useMenuActions(creator);
};
