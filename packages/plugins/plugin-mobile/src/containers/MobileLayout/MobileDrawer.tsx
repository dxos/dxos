//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useAppGraph } from '@dxos/app-toolkit/Hooks';
import { useCompanions, useDeckState, useSelectedCompanion } from '@dxos/plugin-deck/Hooks';
import { useNode } from '@dxos/plugin-graph/Hooks';
import { ActionToolbar, useMenuActions } from '@dxos/react-ui-menu';
import * as Banner from '@dxos/react-ui/Banner';
import * as ErrorFallback from '@dxos/react-ui/ErrorFallback';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { Loading } from '#components';
import { useMobileDrawerActions, useMobileStack } from '#hooks';
import { meta } from '#meta';

const DRAWER_NAME = 'MobileDeckLayout.Drawer';

/**
 * Companion drawer for the visible panel of the mobile stack.
 */
export const MobileDrawer = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { graph } = useAppGraph();
  const { state } = useDeckState();
  const { topId } = useMobileStack();

  const placeholder = useMemo(() => <Loading />, []);

  // Companions of the visible panel; the drawer shows the one the complementary sidebar selects.
  const companions = useCompanions(topId) ?? [];
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
      <Panel.Toolbar asChild>
        <ActionToolbar {...menuActions} alwaysActive onAction={onAction} />
      </Panel.Toolbar>
      <Panel.Content>
        {/* A drawer opened on a plank that contributes no companion would otherwise read as broken. */}
        {data ? (
          <Surface.Surface
            type={AppSurface.Article}
            data={data}
            limit={1}
            fallback={ErrorFallback.Root}
            placeholder={placeholder}
          />
        ) : (
          <Banner.Empty label={t('empty-drawer.message')} />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

MobileDrawer.displayName = DRAWER_NAME;
