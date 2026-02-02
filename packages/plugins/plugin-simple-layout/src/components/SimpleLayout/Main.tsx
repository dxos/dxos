//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework/react';
import { log } from '@dxos/log';
import { useNode } from '@dxos/plugin-graph';
import { Main as NaturalMain } from '@dxos/react-ui';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';

import { useSimpleLayoutState } from '../../hooks';
import { ContentError } from '../ContentError';
import { ContentLoading } from '../ContentLoading';
import { useLoadDescendents } from '../hooks';

import { Banner } from './Banner';
import { NavBar } from './NavBar';

/**
 * Main root component.
 */
export const Main = () => {
  const { state } = useSimpleLayoutState();
  const id = state.active ?? state.workspace;
  const showNavBar = !state.isPopover;
  const { graph } = useAppGraph();
  const node = useNode(graph, id);

  const { id: parentId, variant } = parseEntryId(id);
  const parentNode = useNode(graph, variant ? parentId : undefined);
  // Ensures that children are loaded so that they are available to navigate to.
  useLoadDescendents(id);

  const placeholder = useMemo(() => <ContentLoading />, []);

  const data = useMemo(() => {
    return (
      node && {
        attendableId: id,
        subject: node.data,
        companionTo: parentNode?.data,
        properties: node.properties,
        popoverAnchorId: state.popoverAnchorId,
        variant,
      }
    );
  }, [id, node, node?.data, node?.properties, parentNode?.data, state.popoverAnchorId, variant]);

  const handleActiveIdChange = useCallback((nextActiveId: string | null) => {
    log.info('navigate', { nextActiveId });
  }, []);

  return (
    <Mosaic.Root>
      <NaturalMain.Root complementarySidebarState='closed' navigationSidebarState='closed'>
        <NaturalMain.Content
          bounce
          classNames={mx(
            'dx-mobile-main dx-mobile-main-scroll-area--flush',
            'grid bs-full overflow-hidden',
            showNavBar ? 'grid-rows-[min-content_1fr_min-content]' : 'grid-rows-[min-content_1fr]',
          )}
        >
          <Banner classNames='border-be border-separator' node={node} />
          <article className='contents'>
            <Surface key={id} role='article' data={data} limit={1} fallback={ContentError} placeholder={placeholder} />
          </article>
          {/* TODO(wittjosiah): Since the navbar isn't fixed, if the Surface resolves to nothing the navbar fills the
           screen. */}
          {showNavBar && (
            <NavBar classNames='border-bs border-separator' activeId={id} onActiveIdChange={handleActiveIdChange} />
          )}
        </NaturalMain.Content>
      </NaturalMain.Root>
    </Mosaic.Root>
  );
};

// TODO(wittjosiah): Factor out. Copied from deck plugin.
const parseEntryId = (entryId: string) => {
  const [id, variant] = entryId.split(ATTENDABLE_PATH_SEPARATOR);
  return { id, variant };
};

Main.displayName = 'SimpleLayout.Main';
