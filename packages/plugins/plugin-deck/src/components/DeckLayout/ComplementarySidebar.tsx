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
    () => [
      {
        id: 'complementary-settings',
        data: () => {
          void dispatch({ action: NavigationAction.OPEN, data: { activeParts: { complementary: 'settings' } } });
        },
        properties: {
          label: ['settings label', { ns: DECK_PLUGIN }],
          icon: 'ph--gear--regular',
          menuItemType: 'toggle',
          isChecked: part === 'settings',
        },
      },
      {
        id: 'complementary-comments',
        data: () => {
          void dispatch({ action: NavigationAction.OPEN, data: { activeParts: { complementary: 'comments' } } });
        },
        properties: {
          label: ['comments label', { ns: DECK_PLUGIN }],
          icon: 'ph--chat-text--regular',
          menuItemType: 'toggle',
          isChecked: part === 'comments',
        },
      },
      {
        id: 'complementary-debug',
        data: () => {
          void dispatch({ action: NavigationAction.OPEN, data: { activeParts: { complementary: 'debug' } } });
        },
        properties: {
          label: ['comments label', { ns: DECK_PLUGIN }],
          icon: 'ph--bug--regular',
          menuItemType: 'toggle',
          isChecked: part === 'debug',
        },
      },
    ],
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
        {/* TODO(wittjosiah): Render placeholder when node is undefined. */}
        {node && (
          <Surface
            role={`complementary--${part}`}
            data={{ subject: node.properties.object, popoverAnchorId }}
            limit={1}
            fallback={PlankContentError}
            placeholder={<PlankLoading />}
          />
        )}
      </div>
    </Main.ComplementarySidebar>
  );
};
