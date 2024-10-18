//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import {
  type LayoutParts,
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
  context?: string;
  layoutParts: LayoutParts;
  flatDeck?: boolean;
};

const panels = ['comments', 'settings', 'debug'] as const;

const nodes = [
  { id: 'comments', icon: 'ph--chat-text--regular' },
  { id: 'settings', icon: 'ph--gear--regular' },
  { id: 'debug', icon: 'ph--bug--regular' },
];

type Panel = (typeof panels)[number];
const getPanel = (part?: string): Panel => {
  if (part && panels.findIndex((panel) => panel === part) !== -1) {
    return part as Panel;
  } else {
    return 'settings';
  }
};

export const ComplementarySidebar = ({ layoutParts, flatDeck }: ComplementarySidebarProps) => {
  const { popoverAnchorId } = useLayout();
  const attended = useAttended();
  const part = getPanel(layoutParts.complementary?.[0].id);
  const id = attended[0] ? `${attended[0]}${SLUG_PATH_SEPARATOR}${part}` : undefined;
  const { graph } = useGraph();
  const node = useNode(graph, id);
  const dispatch = useIntentDispatcher();
  useNodeActionExpander(node);

  const actions = useMemo(
    () =>
      nodes.map(({ id, icon }) => ({
        id: `complementary-${id}`,
        data: () => {
          void dispatch({ action: NavigationAction.OPEN, data: { activeParts: { complementary: id } } });
        },
        properties: {
          label: [`${id} label`, { ns: DECK_PLUGIN }],
          icon,
          menuItemType: 'toggle',
          isChecked: part === id,
        },
      })),
    [part],
  );

  return (
    <Main.ComplementarySidebar>
      <div role='none' className={mx(deckGrid, 'grid-cols-1 bs-full')}>
        <NodePlankHeading
          node={node}
          id={id}
          layoutParts={layoutParts}
          layoutPart='complementary'
          popoverAnchorId={popoverAnchorId}
          flatDeck={flatDeck}
          actions={actions}
        />
        {/* TODO(wittjosiah): Render some placeholder when node is undefined. */}
        <div className='row-span-2'>
          {node && (
            <Surface
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
