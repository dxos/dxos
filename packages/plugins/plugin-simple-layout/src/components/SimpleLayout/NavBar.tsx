//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Node, useActionRunner, useConnections } from '@dxos/plugin-graph';
import { IconButton, type ThemedClassName, Toolbar, Tooltip, useSidebars, useTranslation } from '@dxos/react-ui';
import { DropdownMenu, MenuProvider, createMenuAction } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { useCompanions } from '../../hooks';
import { meta } from '../../meta';

const NAVBAR_NAME = 'SimpleLayout.NavBar';

export type NavBarProps = ThemedClassName<{
  activeId?: string;
  onActiveIdChange?: (nextActiveId: string | null) => void;
}>;

export const NavBar = ({ classNames, activeId, onActiveIdChange }: NavBarProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const { invokePromise } = useOperationInvoker();
  const { toggleDrawer } = useSidebars(NAVBAR_NAME);

  const connections = useConnections(graph, Node.RootId);
  const menuActions = connections.filter((node) => node.properties.disposition === 'menu');

  // Get companions for the current primary node.
  const companions = useCompanions(activeId);

  // Create menu actions for companions.
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

  const isBrowseActive = activeId !== 'notifications' && activeId !== 'profile';

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

      <IconButton icon='ph--arrow-up--regular' iconOnly label='Toggle drawer' onClick={() => toggleDrawer()} />

      {/*
        <ButtonGroup>
          <IconButton
            {...buttonProps}
            label={t('browse label')}
            icon='ph--squares-four--regular'
            onClick={() => onActiveIdChange?.(null)}
            variant={isBrowseActive ? 'primary' : 'default'}
            {...(isBrowseActive && { 'aria-current': 'location' })}
          />
          <IconButton
            {...buttonProps}
            label={t('notifications label')}
            icon='ph--bell-simple--regular'
            onClick={() => onActiveIdChange?.('notifications')}
            variant={activeId === 'notifications' ? 'primary' : 'default'}
            {...(activeId === 'notifications' && { 'aria-current': 'location' })}
          />
          <Button
            variant={activeId === 'profile' ? 'primary' : 'default'}
            onClick={() => onActiveIdChange?.('profile')}
            classNames={buttonProps.classNames}
          >
            <span className='sr-only'>{t('profile label')}</span>
            <Avatar.Root>
              <Avatar.Label classNames='sr-only'>Profile display name</Avatar.Label>
              <Avatar.Content size={8} status='active' hue='cyan' fallback='🗿' />
            </Avatar.Root>
          </Button>
        </ButtonGroup>
      */}
    </Toolbar.Root>
  );
};

NavBar.displayName = NAVBAR_NAME;
