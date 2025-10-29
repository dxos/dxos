//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useAppGraph } from '@dxos/app-framework';
import { ROOT_ID, useConnections } from '@dxos/plugin-graph';
import { Avatar, Button, ButtonGroup, DensityProvider, IconButton, Tooltip, useTranslation } from '@dxos/react-ui';
import { DropdownMenu, MenuProvider } from '@dxos/react-ui-menu';
import { mx, surfaceZIndex } from '@dxos/react-ui-theme';

import { meta } from '../meta';

export const bottomNavRoot = mx(
  'fixed inset-inline-0 block-end-[--dx-mobile-bottombar-inset-bottom] bs-[--dx-mobile-bottombar-content-height] grid grid-cols-[min-content_min-content] place-content-center gap-2',
  surfaceZIndex({ level: 'menu' }),
);

export type BottomNavProps = {
  activeId?: string;
  onActiveIdChange?: (nextActiveId: string | null) => void;
};

export const BottomNav = ({ activeId, onActiveIdChange }: BottomNavProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();

  const connections = useConnections(graph, ROOT_ID);
  const menuActions = connections.filter((node) => node.properties.disposition === 'menu');

  const isBrowseActive = activeId !== 'notifications' && activeId !== 'profile';

  return (
    <DensityProvider density='coarse'>
      <nav className={bottomNavRoot}>
        <ButtonGroup>
          <IconButton
            iconOnly
            size={5}
            label={t('browse label')}
            icon='ph--squares-four--regular'
            onClick={() => onActiveIdChange?.(null)}
            classNames='aspect-square'
            variant={isBrowseActive ? 'primary' : 'default'}
            {...(isBrowseActive && { 'aria-current': 'location' })}
          />
          <IconButton
            iconOnly
            size={5}
            label={t('notifications label')}
            icon='ph--bell-simple--regular'
            onClick={() => onActiveIdChange?.('notifications')}
            classNames='aspect-square'
            variant={activeId === 'notifications' ? 'primary' : 'default'}
            {...(activeId === 'notifications' && { 'aria-current': 'location' })}
          />
          <Button
            variant={activeId === 'profile' ? 'primary' : 'default'}
            onClick={() => onActiveIdChange?.('profile')}
            classNames='pli-0 aspect-square'
          >
            <span className='sr-only'>{t('profile label')}</span>
            <Avatar.Root>
              <Avatar.Label classNames='sr-only'>Profile display name</Avatar.Label>
              <Avatar.Content size={6} status='active' hue='cyan' fallback='🗿' />
            </Avatar.Root>
          </Button>
        </ButtonGroup>
        <MenuProvider>
          <DropdownMenu.Root group={graph.root} items={menuActions}>
            <Tooltip.Trigger content={t('app menu label')} side='right' asChild>
              <DropdownMenu.Trigger data-testid='spacePlugin.addSpace' asChild>
                <IconButton
                  iconOnly
                  size={5}
                  icon='ph--plus--regular'
                  label={t('main menu label')}
                  classNames='aspect-square'
                />
              </DropdownMenu.Trigger>
            </Tooltip.Trigger>
          </DropdownMenu.Root>
        </MenuProvider>
      </nav>
    </DensityProvider>
  );
};
