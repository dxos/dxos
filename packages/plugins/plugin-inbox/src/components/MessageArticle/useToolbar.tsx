//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Signal } from '@preact/signals-react';
import { useMemo } from 'react';

import { type DXN } from '@dxos/echo';
import { atomFromSignal, createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';

import { meta } from '../../meta';

export type ViewMode = 'plain' | 'enriched' | 'plain-only';

export type UseMessageToolbarActionsProps = {
  viewMode: Signal<ViewMode>;
  contact: Signal<DXN | undefined>;
  onContactCreate?: () => void;
};

export const useMessageToolbarActions = ({ viewMode, contact, onContactCreate }: UseMessageToolbarActionsProps) => {
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

            if (onContactCreate) {
              const action = createMenuAction('extractContact', onContactCreate, {
                label: contact.value
                  ? ['contact already exists label', { ns: meta.id }]
                  : ['extract contact label', { ns: meta.id }],
                icon: 'ph--user-plus--regular',
                disabled: !!contact.value,
              });
              nodes.push(action);
              edges.push({ source: 'root', target: action.id });
            }

            return { nodes, edges };
          }),
        ),
      ),
    [viewMode, contact, onContactCreate],
  );

  return useMenuActions(creator);
};
