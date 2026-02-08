//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework/react';
import { useNode } from '@dxos/plugin-graph';
import { Main as NaturalMain, useSidebars } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

import { useBannerProps, useNavbarActions, useSimpleLayoutState } from '../../hooks';
import { ContentError } from '../ContentError';
import { ContentLoading } from '../ContentLoading';
import { useLoadDescendents } from '../hooks';

import { Banner } from './Banner';
import { MobileLayout } from './MobileLayout';
import { NavBar } from './NavBar';

const MAIN_NAME = 'SimpleLayout.Main';

/**
 * Main content component.
 */
export const Main = () => {
  const { state } = useSimpleLayoutState();
  const id = state.active ?? state.workspace;
  const attentionAttrs = useAttentionAttributes(id);
  const { graph } = useAppGraph();
  const node = useNode(graph, id);

  // Ensures that children are loaded so that they are available to navigate to.
  useLoadDescendents(id);

  const placeholder = useMemo(() => <ContentLoading />, []);

  const data = useMemo(() => {
    return (
      node && {
        attendableId: id,
        subject: node.data,
        properties: node.properties,
        popoverAnchorId: state.popoverAnchorId,
      }
    );
  }, [id, node, node?.data, node?.properties, state.popoverAnchorId]);

  const { drawerState } = useSidebars(MAIN_NAME);
  const showNavBar = !state.isPopover && drawerState === 'closed';

  const bannerProps = useBannerProps(graph);
  const { actions, onAction } = useNavbarActions();

  return (
    <NaturalMain.Content
      classNames={mx(
        'bs-full grid',
        showNavBar ? 'grid-rows-[min-content_1fr_min-content]' : 'grid-rows-[min-content_1fr]',
        'bg-toolbarSurface',
      )}
      {...attentionAttrs}
    >
      <Banner {...bannerProps} />
      <article className='bs-full overflow-hidden bg-baseSurface'>
        <Surface key={id} role='article' data={data} limit={1} fallback={ContentError} placeholder={placeholder} />
      </article>
      {showNavBar && (
        <MobileLayout.Footer>
          <NavBar classNames='border-bs border-separator' actions={actions} onAction={onAction} />
        </MobileLayout.Footer>
      )}
    </NaturalMain.Content>
  );
};

Main.displayName = MAIN_NAME;
