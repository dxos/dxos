//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
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
  const { actions, onAction } = useNavbarActions();
  const appBarProps = useAppBarProps();

  const placeholder = useMemo(() => <ContentLoading />, []);

  const { graph } = useAppGraph();
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

  // Ensures that children are loaded so that they are available to navigate to.
  useLoadDescendents(id);

  // TODO(burdon): BUG: When showing ANY statusbar the size progressively shrinks when the keyboard opens/closes.
  const showNavBar = !keyboardOpen && !state.isPopover && state.drawerState === 'closed';

  return (
    <div
      role='none'
      className={mx(
        'block-full grid overflow-hidden bg-toolbarSurface',
        showNavBar ? 'grid-rows-[var(--rail-action)_1fr_var(--toolbar-size)]' : 'grid-rows-[var(--rail-action)_1fr]',
      )}
      {...attentionAttrs}
    >
      <AppBar {...appBarProps} />
      <article className='block-full overflow-hidden bg-baseSurface'>
        <Surface.Surface
          key={id}
          role='article'
          data={data}
          limit={1}
          fallback={ContentError}
          placeholder={placeholder}
        />
      </article>
      {showNavBar && <NavBar classNames='border-bs border-subduedSeparator' actions={actions} onAction={onAction} />}
    </div>
  );
};

Main.displayName = MAIN_NAME;
