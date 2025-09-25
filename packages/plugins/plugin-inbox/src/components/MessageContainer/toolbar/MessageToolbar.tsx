//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { type Signal } from '@preact/signals-react';
import { useMemo } from 'react';

import {
  type MenuAction,
  createMenuAction,
  createMenuItemGroup,
  rxFromSignal,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { INBOX_PLUGIN } from '../../../meta';
import { type ViewMode } from '../MessageHeader';

/**
 * Creates a view mode toggle action based on the current view mode
 */
const createViewModeAction = (viewMode: Signal<ViewMode>): MenuAction => {
  const label =
    viewMode.value === 'plain'
      ? 'mailbox toolbar show enriched message'
      : viewMode.value === 'enriched'
        ? 'mailbox toolbar show plain message'
        : 'mailbox toolbar enriched message not available';
  const icon = viewMode.value === 'enriched' ? 'ph--article--regular' : 'ph--graph--regular';

  return createMenuAction(
    'viewMode',
    () => {
      viewMode.value = viewMode.value === 'plain' ? 'enriched' : 'plain';
    },
    {
      label: [label, { ns: INBOX_PLUGIN }],
      icon,
    },
  );
};

// TODO(ZaymonFC): Collapse state to single object.
export const useMessageToolbarActions = (
  viewMode: Signal<ViewMode>,
  existingContact: Signal<any | undefined>,
  onExtractContact: () => void,
) => {
  const creator = useMemo(
    () =>
      Rx.make((get) =>
        get(
          rxFromSignal(() => {
            const nodes = [];
            const edges = [];

            const rootGroup = createMenuItemGroup('root', {
              label: ['mailbox toolbar label', { ns: INBOX_PLUGIN }],
            });
            nodes.push(rootGroup);

            // Create action based on viewMode
            const viewModeAction = createViewModeAction(viewMode);

            nodes.push(viewModeAction);
            edges.push({ source: 'root', target: viewModeAction.id });

            const extractContactAction = createMenuAction('extractContact', onExtractContact, {
              label: existingContact.value
                ? ['contact already exists label', { ns: INBOX_PLUGIN }]
                : ['extract contact label', { ns: INBOX_PLUGIN }],
              icon: 'ph--user-plus--regular',
              disabled: !!existingContact.value,
            });

            nodes.push(extractContactAction);
            edges.push({ source: 'root', target: extractContactAction.id });

            return { nodes, edges };
          }),
        ),
      ),
    [viewMode, existingContact, onExtractContact],
  );

  return useMenuActions(creator);
};
