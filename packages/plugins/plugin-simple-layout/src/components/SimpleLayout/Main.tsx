//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph';
import { ErrorFallback, Panel } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

import { useAppBarProps, useNavbarActions, useSimpleLayoutState } from '../../hooks';
import { Loading } from '../Loading';
import { useExpandPath } from '../hooks';
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
    <Panel.Root
      role='none'
      className={mx(
        'bg-toolbar-surface',
        showNavBar
          ? 'grid-rows-[var(--dx-rail-action)_1fr_var(--dx-toolbar-size)]'
          : 'grid-rows-[var(--dx-rail-action)_1fr]',
      )}
      {...attentionAttrs}
    >
      <Panel.Toolbar asChild>
        <AppBar {...appBarProps} />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <article className='bg-base-surface border'>
          <Surface.Surface
            key={id}
            role='article'
            data={data}
            limit={1}
            fallback={ErrorFallback}
            placeholder={placeholder}
          />
        </article>
      </Panel.Content>
      {showNavBar && (
        <Panel.Statusbar asChild>
          <NavBar classNames='border-y border-subdued-separator' actions={actions} onAction={onAction} />
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

Main.displayName = MAIN_NAME;
