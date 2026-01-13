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

const buttonProps = {
  iconOnly: true,
  size: 6 as Size,
  classNames: 'aspect-square',
};

export type NavBarProps = {
  activeId?: string;
  onActiveIdChange?: (nextActiveId: string | null) => void;
};

export const NavBar = ({ activeId, onActiveIdChange }: NavBarProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();

  const connections = useConnections(graph, Node.RootId);
  const menuActions = connections.filter((node) => node.properties.disposition === 'menu');

  const isBrowseActive = activeId !== 'notifications' && activeId !== 'profile';

  return (
    <DensityProvider density='coarse'>
      <nav
        className={mx(
          'fixed inset-inline-0 block-end-0',
          'grid grid-cols-[min-content_min-content] gap-2 justify-center content-start',
          'pbe-[env(safe-area-inset-bottom)] bs-[calc(env(safe-area-inset-bottom)+var(--dx-mobile-bottombar-content-height,64px))]',
          'bg-baseSurface border-bs border-separator',
          surfaceZIndex({ level: 'menu' }),
        )}
      >
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
        <MenuProvider>
          <DropdownMenu.Root items={menuActions}>
            <Tooltip.Trigger asChild content={t('app menu label')} side='right'>
              <DropdownMenu.Trigger asChild data-testid='spacePlugin.addSpace'>
                <IconButton {...buttonProps} icon='ph--plus--regular' label={t('main menu label')} />
              </DropdownMenu.Trigger>
            </Tooltip.Trigger>
          </DropdownMenu.Root>
        </MenuProvider>
      </nav>
    </DensityProvider>
  );
};
