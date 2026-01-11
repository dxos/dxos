//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useAppGraph } from '@dxos/app-framework/react';
import { Node, useConnections } from '@dxos/plugin-graph';
import {
  Avatar,
  Button,
  ButtonGroup,
  DensityProvider,
  IconButton,
  type Size,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { DropdownMenu, MenuProvider } from '@dxos/react-ui-menu';
import { mx, surfaceZIndex } from '@dxos/ui-theme';

import { meta } from '../../meta';

export const bottomNavRoot = mx(
  'fixed inset-inline-0 block-end-[--dx-mobile-bottombar-inset-bottom,0px] bs-[--dx-mobile-bottombar-content-height,64px] bg-baseSurface border-bs border-separator grid grid-cols-[min-content_min-content] place-content-center gap-2',
  surfaceZIndex({ level: 'menu' }),
);

export type BottomNavProps = {
  activeId?: string;
  onActiveIdChange?: (nextActiveId: string | null) => void;
};

const navButtonProps = {
  iconOnly: true,
  size: 6 as Size,
  classNames: 'aspect-square',
};

export const BottomNav = ({ activeId, onActiveIdChange }: BottomNavProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();

  const connections = useConnections(graph, Node.RootId);
  const menuActions = connections.filter((node) => node.properties.disposition === 'menu');

  const isBrowseActive = activeId !== 'notifications' && activeId !== 'profile';

  return (
    <DensityProvider density='coarse'>
      <nav className={bottomNavRoot}>
        <ButtonGroup>
          <IconButton
            {...navButtonProps}
            label={t('browse label')}
            icon='ph--squares-four--regular'
            onClick={() => onActiveIdChange?.(null)}
            variant={isBrowseActive ? 'primary' : 'default'}
            {...(isBrowseActive && { 'aria-current': 'location' })}
          />
          <IconButton
            {...navButtonProps}
            label={t('notifications label')}
            icon='ph--bell-simple--regular'
            onClick={() => onActiveIdChange?.('notifications')}
            variant={activeId === 'notifications' ? 'primary' : 'default'}
            {...(activeId === 'notifications' && { 'aria-current': 'location' })}
          />
          <Button
            variant={activeId === 'profile' ? 'primary' : 'default'}
            onClick={() => onActiveIdChange?.('profile')}
            classNames={navButtonProps.classNames}
          >
            <span className='sr-only'>{t('profile label')}</span>
            <Avatar.Root>
              <Avatar.Label classNames='sr-only'>Profile display name</Avatar.Label>
              <Avatar.Content size={8} status='active' hue='cyan' fallback='🗿' />
            </Avatar.Root>
          </Button>
        </ButtonGroup>
        <MenuProvider>
          <DropdownMenu.Root items={menuActions}>
            <Tooltip.Trigger content={t('app menu label')} side='right' asChild>
              <DropdownMenu.Trigger data-testid='spacePlugin.addSpace' asChild>
                <IconButton {...navButtonProps} icon='ph--plus--regular' label={t('main menu label')} />
              </DropdownMenu.Trigger>
            </Tooltip.Trigger>
          </DropdownMenu.Root>
        </MenuProvider>
      </nav>
    </DensityProvider>
  );
};
