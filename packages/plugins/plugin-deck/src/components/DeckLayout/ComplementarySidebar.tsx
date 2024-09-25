//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type LayoutParts, SLUG_PATH_SEPARATOR, Surface } from '@dxos/app-framework';
import { useGraph } from '@dxos/plugin-graph';
import { Main } from '@dxos/react-ui';
import { createAttendableAttributes, useAttendedIds } from '@dxos/react-ui-attention';
import { deckGrid } from '@dxos/react-ui-deck';
import { mx } from '@dxos/react-ui-theme';

import { NodePlankHeading } from './NodePlankHeading';
import { PlankContentError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { useNode, useNodeActionExpander } from '../../hooks';
import { useLayout } from '../LayoutContext';

export type ComplementarySidebarProps = {
  context?: string;
  layoutParts: LayoutParts;
  flatDeck?: boolean;
};

export const ComplementarySidebar = ({ context, layoutParts, flatDeck }: ComplementarySidebarProps) => {
  const { popoverAnchorId } = useLayout();
  const attended = useAttendedIds();
  const id = attended[0] ? `${attended[0]}${SLUG_PATH_SEPARATOR}${context}` : undefined;
  const { graph } = useGraph();
  const node = useNode(graph, id);
  const complementaryAttrs = createAttendableAttributes(id?.split(SLUG_PATH_SEPARATOR)[0] ?? 'never');

  useNodeActionExpander(node);

  return (
    <Main.ComplementarySidebar {...complementaryAttrs}>
      <div role='none' className={mx(deckGrid, 'grid-cols-1 bs-full')}>
        <NodePlankHeading
          node={node}
          id={id}
          layoutParts={layoutParts}
          layoutPart='complementary'
          popoverAnchorId={popoverAnchorId}
          flatDeck={flatDeck}
        />
        {/* TODO(wittjosiah): Render some placeholder when node is undefined. */}
        {node && (
          <Surface
            role='article'
            data={{ subject: node.data, part: 'complementary', popoverAnchorId }}
            limit={1}
            fallback={PlankContentError}
            placeholder={<PlankLoading />}
          />
        )}
      </div>
    </Main.ComplementarySidebar>
  );
};
