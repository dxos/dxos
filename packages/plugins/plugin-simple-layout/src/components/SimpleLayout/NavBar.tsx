//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Node, useActionRunner, useConnections } from '@dxos/plugin-graph';
import { IconButton, type ThemedClassName, Toolbar, Tooltip, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { DropdownMenu, MenuProvider } from '@dxos/react-ui-menu';
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

  const companions = useCompanions(activeId);
  const connections = useConnections(graph, Node.RootId);
  const menuActions = connections.filter((node) => node.properties.disposition === 'menu');

  return (
    <Toolbar.Root density='coarse' classNames={mx('justify-center', classNames)}>
      {companions.map((companion) => (
        <Toolbar.IconButton
          key={companion.id}
          icon={companion.properties.icon ?? 'ph--placeholder--regular'}
          iconOnly
          label={toLocalizedString(companion.properties.label, t)}
          onClick={() => {
            void invokePromise(Common.LayoutOperation.Open, {
              subject: [companion.id],
            });
          }}
        />
      ))}

      <Toolbar.Separator variant='gap' />

      <MenuProvider onAction={runAction}>
        <DropdownMenu.Root items={menuActions}>
          <Tooltip.Trigger asChild content={t('app menu label')}>
            <DropdownMenu.Trigger asChild data-testid='simpleLayoutPlugin.addSpace'>
              <IconButton icon='ph--plus--regular' iconOnly label={t('main menu label')} />
            </DropdownMenu.Trigger>
          </Tooltip.Trigger>
        </DropdownMenu.Root>
      </MenuProvider>
    </Toolbar.Root>
  );
};

NavBar.displayName = NAVBAR_NAME;
