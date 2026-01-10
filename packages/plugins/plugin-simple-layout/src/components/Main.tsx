//
// Copyright 2025 DXOS.org
//

import React, { Activity, useMemo } from 'react';

import { Surface, useAppGraph, useCapability } from '@dxos/app-framework/react';
import { useNode } from '@dxos/plugin-graph';
import { Main as NaturalMain } from '@dxos/react-ui';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';

import { SimpleLayoutState } from '../types';

import { Banner } from './Banner';
import { BottomNav } from './BottomNav';
import { ContentError } from './ContentError';
import { ContentLoading } from './ContentLoading';
import { Home } from './Home';

export const Main = () => {
  const layout = useCapability(SimpleLayoutState);
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

  // Show bottom nav only in mobile mode (not popover).
  const showBottomNav = !layout.isPopover;
  // Always show banner when viewing content (not on home).
  const showBanner = id !== 'default';

  // TODO(wittjosiah): Content probably needs a header with title and back button.
  return (
    <NaturalMain.Root complementarySidebarState='closed' navigationSidebarState='closed'>
      <NaturalMain.Content bounce classNames='dx-mobile-main dx-mobile-main-scroll-area--flush !overflow-y-auto'>
        <Activity mode={id === 'default' ? 'visible' : 'hidden'}>
          <Home />
        </Activity>
        <Activity mode={id !== 'default' ? 'visible' : 'hidden'}>
          {showBanner && <Banner node={node} />}
          <section className={showBanner ? 'pbs-[60px]' : ''}>
            <Surface key={id} role='article' data={data} limit={1} fallback={ContentError} placeholder={placeholder} />
          </section>
        </Activity>
        {showBottomNav && <BottomNav activeId={id} onActiveIdChange={handleActiveIdChange} />}
      </NaturalMain.Content>
    </NaturalMain.Root>
  );
};

// TODO(wittjosiah): Factor out. Copied from deck plugin.
const parseEntryId = (entryId: string) => {
  const [id, variant] = entryId.split(ATTENDABLE_PATH_SEPARATOR);
  return { id, variant };
};
