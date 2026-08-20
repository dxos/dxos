//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { useDeckState } from '@dxos/plugin-deck/hooks';
import { useNode } from '@dxos/plugin-graph/hooks';
import { ErrorFallback, Panel } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';

import { Loading, MobileAppBar, MobileNavBar, NavigationStack, useExpandPath, useMobileLayout } from '#components';
import { useMobileAppBar, useMobileNavbarActions, useMobileStack } from '#hooks';

const MAIN_NAME = 'MobileDeckLayout.Main';
const MAIN_PANEL_NAME = 'MobileDeckLayout.MainPanel';

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
 * Mobile main content: the deck's active panels projected as a navigation stack.
 */
export const MobileMain = () => {
  const { state } = useDeckState();
  const { stack, topId, pop } = useMobileStack();
  const attentionAttrs = useAttentionAttributes(topId);
  const { keyboardOpen } = useMobileLayout(MAIN_NAME);
  const { actions, onAction } = useMobileNavbarActions();
  const appBarProps = useMobileAppBar();

  useExpandPath(topId);

  // The drawer occupies the bottom of the screen when open, so the navbar would collide with it.
  const drawerClosed = !state.complementarySidebarPanel || state.complementarySidebarState === 'closed';
  const showNavBar = !keyboardOpen && drawerClosed;

  return (
    <Panel.Root {...attentionAttrs} classNames='dx-document'>
      <Panel.Toolbar asChild>
        <MobileAppBar {...appBarProps} />
      </Panel.Toolbar>
      <Panel.Content role='article' classNames='dx-base-surface'>
        <NavigationStack
          classNames='size-full'
          items={stack}
          index={stack.length - 1}
          onIndexChange={pop}
          renderItem={(itemId) => <MainPanel id={itemId} popoverAnchorId={state.popoverAnchorId} />}
        />
      </Panel.Content>
      {showNavBar && (
        <Panel.Statusbar asChild>
          <MobileNavBar actions={actions} onAction={onAction} />
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

MobileMain.displayName = MAIN_NAME;
