//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useAppGraph } from '@dxos/app-framework/react';
import { Node, useActionRunner, useConnections } from '@dxos/plugin-graph';
import { IconButton, type ThemedClassName, Toolbar, Tooltip, useTranslation } from '@dxos/react-ui';
import { DropdownMenu, MenuProvider } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

export type NavBarProps = ThemedClassName<{
  activeId?: string;
  onActiveIdChange?: (nextActiveId: string | null) => void;
}>;

export const NavBar = ({ classNames, activeId, onActiveIdChange }: NavBarProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const runAction = useActionRunner();

  const connections = useConnections(graph, Node.RootId);
  const menuActions = connections.filter((node) => node.properties.disposition === 'menu');

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
      </MenuProvider>
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
