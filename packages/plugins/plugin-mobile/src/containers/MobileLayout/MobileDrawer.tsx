//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { useCompanions, useDeckState, useSelectedCompanion } from '@dxos/plugin-deck/hooks';
import { useNode } from '@dxos/plugin-graph/hooks';
import { ErrorFallback, Panel } from '@dxos/react-ui';
import { Menu, useMenuActions } from '@dxos/react-ui-menu';

import { Loading } from '#components';
import { useMobileDrawerActions, useMobileStack } from '#hooks';

const DRAWER_NAME = 'MobileDeckLayout.Drawer';

/**
 * Companion drawer for the visible panel of the mobile stack.
 */
export const MobileDrawer = () => {
  const { graph } = useAppGraph();
  const { state } = useDeckState();
  const { topId } = useMobileStack();

  const placeholder = useMemo(() => <Loading />, []);

  // Companions of the visible panel; the drawer shows the one the complementary sidebar selects.
  const companions = useCompanions(topId);
  const { companionId, variant } = useSelectedCompanion(companions, state.complementarySidebarPanel);

  const node = useNode(graph, companionId);
  const parentNode = useNode(graph, topId);

  const data = useMemo<AppSurface.ArticleData | undefined>(() => {
    if (!node || !companionId) {
      return undefined;
    }

    return {
      attendableId: companionId,
      subject: node.data,
      companionTo: parentNode?.data,
      properties: node.properties,
      variant,
    };
  }, [companionId, node, parentNode, variant]);

  const { actions, onAction } = useMobileDrawerActions(DRAWER_NAME);
  const menuActions = useMenuActions(actions);

  return (
    <Panel.Root>
      <Panel.Toolbar>
        <Menu.Root {...menuActions} alwaysActive onAction={onAction}>
          <Menu.Toolbar>
            <Menu.Items />
          </Menu.Toolbar>
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Surface.Surface
          type={AppSurface.Article}
          data={data}
          limit={1}
          fallback={ErrorFallback}
          placeholder={placeholder}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

MobileDrawer.displayName = DRAWER_NAME;
