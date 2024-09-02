//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type LayoutParts, SLUG_PATH_SEPARATOR, Surface } from '@dxos/app-framework';
import { useGraph } from '@dxos/plugin-graph';
import { Main } from '@dxos/react-ui';
import { createAttendableAttributes } from '@dxos/react-ui-attention';
import { deckGrid } from '@dxos/react-ui-deck';
import { mx } from '@dxos/react-ui-theme';

import { NodePlankHeading } from './NodePlankHeading';
import { PlankContentError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { useNode, useNodeActionExpander } from '../../hooks';
import { useLayout } from '../LayoutContext';

export type ComplementarySidebarProps = {
  id?: string;
  layoutParts: LayoutParts;
  flatDeck?: boolean;
};

export const ComplementarySidebar = ({ id, layoutParts, flatDeck }: ComplementarySidebarProps) => {
  const { popoverAnchorId } = useLayout();
  const { graph } = useGraph();
  const node = useNode(graph, id);
  // const complementaryAvailable = useMemo(() => id === NAV_ID || !!node, [id, node]);
  const complementaryAttrs = createAttendableAttributes(id?.split(SLUG_PATH_SEPARATOR)[0] ?? 'never');

  useNodeActionExpander(node);

  return (
    <Main.ComplementarySidebar {...complementaryAttrs}>
      {node ? (
        <div role='none' className={mx(deckGrid, 'grid-cols-1 bs-full')}>
          <NodePlankHeading
            node={node}
            id={id}
            layoutParts={layoutParts}
            layoutPart='complementary'
            popoverAnchorId={popoverAnchorId}
            flatDeck={flatDeck}
          />
          <Surface
            role='article'
            data={{ subject: node.data, part: 'complementary', popoverAnchorId }}
            limit={1}
            fallback={PlankContentError}
            placeholder={<PlankLoading />}
          />
        </div>
      ) : null}
    </Main.ComplementarySidebar>
  );
};
