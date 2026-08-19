//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Loading, NavigationStack, useExpandPath, useMobileLayout } from '@dxos/plugin-deck';
import { useNode } from '@dxos/plugin-graph/hooks';
import { ErrorFallback, Panel } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';

import { useAppBarProps, useNavbarActions, useSimpleLayoutState } from '#hooks';

import { AppBar } from './AppBar';
import { NavBar } from './NavBar';

const MAIN_NAME = 'SimpleLayout.Main';
const MAIN_PANEL_NAME = 'SimpleLayout.MainPanel';

type MainPanelProps = {
  id: string;
  popoverAnchorId?: string;
};

/**
 * One panel of the navigation stack. Its own component because every panel resolves its own graph
 * node, and the stack renders a variable number of them — hooks cannot run in a loop.
 */
const MainPanel = ({ id, popoverAnchorId }: MainPanelProps) => {
  const { graph } = useAppGraph();
  const node = useNode(graph, id);
  const placeholder = useMemo(() => <Loading />, []);
  const data = useMemo(() => {
    return (
      node && {
        attendableId: id,
        subject: node.data,
        properties: node.properties,
        popoverAnchorId,
      }
    );
  }, [id, node, node?.data, node?.properties, popoverAnchorId]);

  return (
    <Surface.Surface
      key={id}
      type={AppSurface.Article}
      data={data}
      limit={1}
      fallback={ErrorFallback}
      placeholder={placeholder}
    />
  );
};

MainPanel.displayName = MAIN_PANEL_NAME;

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
  const { invokePromise } = useOperationInvoker();

  useExpandPath(id);

  // `Open` pushes onto `history` and `Close` pops it, so the navigated stack is history + active.
  const stack = useMemo(() => [...state.history, id], [state.history, id]);

  // Popping routes through `Close`, the same operation the app bar's back button invokes, so the
  // chevron and the swipe cannot disagree about what "back" means.
  const handleNavigate = useCallback(() => {
    if (state.active) {
      void invokePromise(LayoutOperation.Close, { subject: [state.active] });
    }
  }, [invokePromise, state.active]);

  // TODO(burdon): BUG: When showing ANY statusbar the size progressively shrinks when the keyboard opens/closes.
  const showNavBar = !keyboardOpen && !state.isPopover && state.drawerState === 'closed';

  return (
    <Panel.Root {...attentionAttrs} classNames='dx-document'>
      <Panel.Toolbar asChild>
        <AppBar {...appBarProps} />
      </Panel.Toolbar>
      <Panel.Content role='article' classNames='dx-base-surface'>
        <NavigationStack
          classNames='size-full'
          items={stack}
          index={stack.length - 1}
          onIndexChange={handleNavigate}
          renderItem={(itemId) => <MainPanel id={itemId} popoverAnchorId={state.popoverAnchorId} />}
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
