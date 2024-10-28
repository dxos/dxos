//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import {
  type LayoutCoordinate,
  NavigationAction,
  SLUG_PATH_SEPARATOR,
  Surface,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { useGraph } from '@dxos/plugin-graph';
import { Main } from '@dxos/react-ui';
import { useAttended } from '@dxos/react-ui-attention';
import { deckGrid } from '@dxos/react-ui-deck';
import { mx } from '@dxos/react-ui-theme';

import { NodePlankHeading } from './NodePlankHeading';
import { PlankContentError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { useNode, useNodeActionExpander } from '../../hooks';
import { DECK_PLUGIN } from '../../meta';
import { useLayout } from '../LayoutContext';

export type ComplementarySidebarProps = {
  panel?: string;
  flatDeck?: boolean;
};

type Panel = { id: string; icon: string };

// TODO(burdon): Should be provided by plugins.
const panels: Panel[] = [
  { id: 'settings', icon: 'ph--gear--regular' },
  { id: 'comments', icon: 'ph--chat-text--regular' },
  { id: 'automation', icon: 'ph--atom--regular' },
  { id: 'debug', icon: 'ph--bug--regular' },
];

const getPanel = (id?: string): Panel['id'] => {
  const panel = panels.find((p) => p.id === id) ?? panels[0];
  return panel.id;
};

export const ComplementarySidebar = ({ panel, flatDeck }: ComplementarySidebarProps) => {
  const { popoverAnchorId } = useLayout();
  const attended = useAttended();
  const part = getPanel(panel);
  const id = attended[0] ? `${attended[0]}${SLUG_PATH_SEPARATOR}${part}` : undefined;
  const { graph } = useGraph();
  const node = useNode(graph, id);
  const dispatch = useIntentDispatcher();
  useNodeActionExpander(node);

  const actions = useMemo(
    () =>
      panels.map(({ id, icon }) => ({
        id: `complementary-${id}`,
        data: () => {
          void dispatch({ action: NavigationAction.OPEN, data: { activeParts: { complementary: id } } });
        },
        properties: {
          label: [`open ${id} label`, { ns: DECK_PLUGIN }],
          icon,
          menuItemType: 'toggle',
          isChecked: part === id,
        },
      })),
    [part],
  );

  // TODO(wittjosiah): Ensure that id is always defined.
  const coordinate: LayoutCoordinate = useMemo(() => ({ entryId: id ?? 'unknown', part: 'complementary' }), [id]);

  return (
    <Main.ComplementarySidebar>
      <div role='none' className={mx(deckGrid, 'grid-cols-1 bs-full')}>
        <NodePlankHeading
          coordinate={coordinate}
          node={node}
          popoverAnchorId={popoverAnchorId}
          flatDeck={flatDeck}
          actions={actions}
        />
        <div className='row-span-2 divide-y divide-separator'>
          {node && (
            <Surface
              key={id}
              role={`complementary--${part}`}
              data={{ subject: node.properties.object, popoverAnchorId }}
              fallback={PlankContentError}
              placeholder={<PlankLoading />}
            />
          )}
        </div>
      </div>
    </Main.ComplementarySidebar>
  );
};
