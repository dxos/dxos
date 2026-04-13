//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph';
import { ErrorFallback, Panel } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';

import { useAppBarProps, useNavbarActions, useSimpleLayoutState } from '#hooks';

import { useExpandPath } from '../hooks';
import { Loading } from '../Loading';
import { useMobileLayout } from '../MobileLayout';
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

  const placeholder = useMemo(() => <Loading />, []);

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

  useExpandPath(id);

  // TODO(burdon): BUG: When showing ANY statusbar the size progressively shrinks when the keyboard opens/closes.
  const showNavBar = !keyboardOpen && !state.isPopover && state.drawerState === 'closed';

  return (
    <Panel.Root {...attentionAttrs} className='dx-document'>
      <Panel.Toolbar asChild>
        <AppBar {...appBarProps} />
      </Panel.Toolbar>
      <Panel.Content role='article' className='bg-base-surface'>
        <Surface.Surface
          key={id}
          role='article'
          data={data}
          limit={1}
          fallback={ErrorFallback}
          placeholder={placeholder}
        />
      </Panel.Content>
      {showNavBar && (
        <Panel.Statusbar asChild>
          <NavBar actions={actions} onAction={onAction} />
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

Main.displayName = MAIN_NAME;
