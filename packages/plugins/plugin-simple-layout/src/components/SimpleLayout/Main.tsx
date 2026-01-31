//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework/react';
import { useNode } from '@dxos/plugin-graph';
import { Main as NaturalMain } from '@dxos/react-ui';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';

import { useSimpleLayoutState } from '../../hooks';
import { ContentError } from '../ContentError';
import { ContentLoading } from '../ContentLoading';

import { Banner } from './Banner';
import { NavBar } from './NavBar';

export const Main = () => {
  const { state } = useSimpleLayoutState();
  const id = state.active ?? state.workspace;
  const { graph } = useAppGraph();
  const node = useNode(graph, id);

  const placeholder = useMemo(() => <ContentLoading />, []);

  const { variant } = parseEntryId(id);
  const data = useMemo(
    () =>
      node && {
        attendableId: id,
        subject: node.data,
        properties: node.properties,
        variant,
        popoverAnchorId: state.popoverAnchorId,
      },
    [node, node?.data, node?.properties, state.popoverAnchorId, variant, id],
  );

  const handleActiveIdChange = (nextActiveId: string | null) => {
    // eslint-disable-next-line no-console
    console.log('[navigate]', nextActiveId);
  };

  const showNavBar = !state.isPopover;

  return (
    <Mosaic.Root>
      <NaturalMain.Root complementarySidebarState='closed' navigationSidebarState='closed'>
        <NaturalMain.Content bounce classNames='dx-mobile-main dx-mobile-main-scroll-area--flush !overflow-y-auto'>
          <div
            className={mx(
              'grid bs-full overflow-hidden',
              showNavBar ? 'grid-rows-[min-content_1fr_min-content]' : 'grid-rows-[min-content_1fr]',
            )}
          >
            <Banner node={node} classNames='border-be border-separator' />
            <article className='contents'>
              <Surface
                key={id}
                role='article'
                data={data}
                limit={1}
                fallback={ContentError}
                placeholder={placeholder}
              />
            </article>
            {showNavBar && (
              <NavBar classNames='border-bs border-separator' activeId={id} onActiveIdChange={handleActiveIdChange} />
            )}
          </div>
        </NaturalMain.Content>
      </NaturalMain.Root>
    </Mosaic.Root>
  );
};

Main.displayName = 'SimpleLayout.Main';

// TODO(wittjosiah): Factor out. Copied from deck plugin.
const parseEntryId = (entryId: string) => {
  const [id, variant] = entryId.split(ATTENDABLE_PATH_SEPARATOR);
  return { id, variant };
};
