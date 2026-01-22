//
// Copyright 2025 DXOS.org
//

import React, { Activity, useMemo } from 'react';

import { Surface, useAppGraph, useCapability } from '@dxos/app-framework/react';
import { useNode } from '@dxos/plugin-graph';
import { Main as NaturalMain } from '@dxos/react-ui';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

import { useSpotlightDismiss } from '../../hooks';
import { SimpleLayoutState } from '../../types';
import { ContentError } from '../ContentError';
import { ContentLoading } from '../ContentLoading';
import { Home } from '../Home';

import { Banner } from './Banner';
import { NavBar } from './NavBar';

export const Main = () => {
  const layout = useCapability(SimpleLayoutState);
  useSpotlightDismiss(layout?.isPopover);

  const id = layout.active ?? layout.workspace;
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
        popoverAnchorId: layout.popoverAnchorId,
      },
    [node, node?.data, node?.properties, layout.popoverAnchorId, variant, id],
  );

  const handleActiveIdChange = (nextActiveId: string | null) => {
    // eslint-disable-next-line no-console
    console.log('[navigate]', nextActiveId);
  };

  const showNavBar = !layout.isPopover;

  return (
    <NaturalMain.Root complementarySidebarState='closed' navigationSidebarState='closed'>
      <NaturalMain.Content bounce classNames='!overflow-y-auto'>
        <div
          className={mx(
            'bs-full overflow-hidden grid',
            'pis-[env(safe-area-inset-left)] pie-[env(safe-area-inset-right)]',
            showNavBar ? 'grid-rows-[min-content_1fr_min-content]' : 'grid-rows-[min-content_1fr]',
          )}
        >
          <Banner node={node} />
          <Activity mode={id === 'default' ? 'visible' : 'hidden'}>
            <Home />
          </Activity>
          <Activity mode={id !== 'default' ? 'visible' : 'hidden'}>
            {/* TODO(wittjosiah): This class is needed to constrain the content area on mobile. Better way? */}
            <section className='overflow-x-hidden'>
              <Surface
                key={id}
                role='article'
                data={data}
                limit={1}
                fallback={ContentError}
                placeholder={placeholder}
              />
            </section>
          </Activity>
          {showNavBar && <NavBar activeId={id} onActiveIdChange={handleActiveIdChange} />}
        </div>
      </NaturalMain.Content>
    </NaturalMain.Root>
  );
};

// TODO(wittjosiah): Factor out. Copied from deck plugin.
const parseEntryId = (entryId: string) => {
  const [id, variant] = entryId.split(ATTENDABLE_PATH_SEPARATOR);
  return { id, variant };
};
