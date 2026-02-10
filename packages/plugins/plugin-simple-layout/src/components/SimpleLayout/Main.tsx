//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework/react';
import { useNode } from '@dxos/plugin-graph';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

import { useAppBarProps, useNavbarActions, useSimpleLayoutState } from '../../hooks';
import { ContentError } from '../ContentError';
import { ContentLoading } from '../ContentLoading';
import { useLoadDescendents } from '../hooks';
import { useMobileLayout } from '../MobileLayout/MobileLayout';

import { AppBar } from './AppBar';
import { NavBar } from './NavBar';

const MAIN_NAME = 'SimpleLayout.Main';

/**
 * Main content component.
 */
export const Main = () => {
  const { state } = useSimpleLayoutState();
  const id = state.active ?? state.workspace;
  const attentionAttrs = useAttentionAttributes(id);
  const { keyboardOpen } = useMobileLayout(MAIN_NAME);
  const placeholder = useMemo(() => <ContentLoading />, []);
  const { actions, onAction } = useNavbarActions();

  // Ensures that children are loaded so that they are available to navigate to.
  useLoadDescendents(id);

  const { graph } = useAppGraph();
  const appBarProps = useAppBarProps(graph);
  const node = useNode(graph, id);
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

  const showNavBar = !keyboardOpen && !state.isPopover && state.drawerState === 'closed';

  return (
    <div
      role='none'
      className={mx(
        'bs-full grid bg-toolbarSurface',
        showNavBar ? 'grid-rows-[min-content_1fr_min-content]' : 'grid-rows-[min-content_1fr]',
      )}
      {...attentionAttrs}
    >
      <AppBar {...appBarProps} />
      <article className='bs-full overflow-hidden bg-baseSurface'>
        <Surface key={id} role='article' data={data} limit={1} fallback={ContentError} placeholder={placeholder} />
      </article>
      {showNavBar && <NavBar classNames='border-bs border-subduedSeparator' actions={actions} onAction={onAction} />}
    </div>
  );
};

Main.displayName = MAIN_NAME;
