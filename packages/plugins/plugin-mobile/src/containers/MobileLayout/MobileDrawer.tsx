//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as DeckHooks from '@dxos/plugin-deck/Hooks';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { Empty, ErrorFallback, Panel, useTranslation } from '@dxos/react-ui';
import { ActionToolbar, useMenuActions } from '@dxos/react-ui-menu';

import { Loading } from '#components';
import { useMobileDrawerActions, useMobileStack } from '#hooks';
import { meta } from '#meta';

const DRAWER_NAME = 'MobileDeckLayout.Drawer';

/**
 * Companion drawer for the visible panel of the mobile stack.
 */
export const MobileDrawer = () => {
  const { t } = useTranslation(meta.profile.key);
  const { graph } = Hooks.useAppGraph();
  const { state } = DeckHooks.useDeckState();
  const { topId } = useMobileStack();

  const placeholder = useMemo(() => <Loading />, []);

  // Companions of the visible panel; the drawer shows the one the complementary sidebar selects.
  const companions = DeckHooks.useCompanions(topId) ?? [];
  const { companionId, variant } = DeckHooks.useSelectedCompanion(companions, state.complementarySidebarPanel);

  const node = GraphHooks.useNode(graph, companionId);
  const parentNode = GraphHooks.useNode(graph, topId);

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
      <Panel.Header>
        <ActionToolbar {...menuActions} alwaysActive onAction={onAction} />
      </Panel.Header>
      <Panel.Body>
        {/* A drawer opened on a plank that contributes no companion would otherwise read as broken. */}
        {data ? (
          <Surface.Surface
            type={AppSurface.Article}
            data={data}
            limit={1}
            fallback={ErrorFallback}
            placeholder={placeholder}
          />
        ) : (
          <Empty>{t('empty-drawer.message')}</Empty>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

MobileDrawer.displayName = DRAWER_NAME;
