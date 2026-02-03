//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Node, useActionRunner, useConnections } from '@dxos/plugin-graph';
import { IconButton, type ThemedClassName, Toolbar, Tooltip, useTranslation } from '@dxos/react-ui';
import { DropdownMenu, MenuProvider, createMenuAction } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { useCompanions } from '../../hooks';
import { meta } from '../../meta';

const NAVBAR_NAME = 'SimpleLayout.NavBar';

export type NavBarProps = ThemedClassName<{
  /** Active AppGraph node ID. */
  activeId?: string;
}>;

export const NavBar = ({ classNames, activeId }: NavBarProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const { invokePromise } = useOperationInvoker();

  const connections = useConnections(graph, Node.RootId);
  const menuActions = connections.filter((node) => node.properties.disposition === 'menu');

  // Create menu actions for companions.
  const companions = useCompanions(activeId);
  const companionMenuActions = useMemo(
    () =>
      companions.map((companion) =>
        createMenuAction(
          companion.id,
          () => {
            void invokePromise(Common.LayoutOperation.Open, {
              subject: [companion.id],
            });
          },
          {
            icon: companion.properties.icon,
            label: companion.properties.label,
          },
        ),
      ),
    [companions, invokePromise],
  );

  return (
    <Toolbar.Root classNames={mx('justify-center', classNames)}>
      <MenuProvider onAction={runAction}>
        <DropdownMenu.Root items={menuActions}>
          <Tooltip.Trigger asChild content={t('app menu label')}>
            <DropdownMenu.Trigger asChild data-testid='spacePlugin.addSpace'>
              <IconButton icon='ph--plus--regular' iconOnly label={t('main menu label')} />
            </DropdownMenu.Trigger>
          </Tooltip.Trigger>
        </DropdownMenu.Root>

        {/* TODO(burdon): Convert to toolbar. */}
        <DropdownMenu.Root items={companionMenuActions}>
          <Tooltip.Trigger asChild content={t('companions menu label')}>
            <DropdownMenu.Trigger asChild disabled={companions.length === 0}>
              <IconButton
                icon='ph--square-split-horizontal--regular'
                iconOnly
                label={t('companions menu label')}
                disabled={companions.length === 0}
              />
            </DropdownMenu.Trigger>
          </Tooltip.Trigger>
        </DropdownMenu.Root>
      </MenuProvider>
    </Toolbar.Root>
  );
};

NavBar.displayName = NAVBAR_NAME;
