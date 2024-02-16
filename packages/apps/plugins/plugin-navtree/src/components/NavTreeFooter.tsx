//
// Copyright 2024 DXOS.org
//

import { GearSix } from '@phosphor-icons/react';
import React from 'react';

import { SettingsAction, useIntent } from '@dxos/app-framework';
import { useConfig } from '@dxos/react-client';
import { Button, Tooltip, useSidebars, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { NAVTREE_PLUGIN } from '../meta';

export const NavTreeFooter = () => {
  const config = useConfig();
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { navigationSidebarOpen } = useSidebars(NAVTREE_PLUGIN);
  const { dispatch } = useIntent();

  return (
    <div role='none' className='bs-[--rail-size] box-content separator-separator border-bs pli-1 flex justify-end'>
      <div role='none' className='grid grid-cols-[repeat(auto-fit,var(--rail-action))]'>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            {/* TODO(burdon): Reconcile with action created by LayoutPlugin. */}
            <Button
              data-joyride='welcome/settings'
              variant='ghost'
              classNames='pli-0 border-bs-4 border-be-4 border-transparent bg-clip-padding'
              data-testid='treeView.openSettings'
              {...(!navigationSidebarOpen && { tabIndex: -1 })}
              onClick={() => dispatch({ action: SettingsAction.OPEN })}
            >
              <span className='sr-only'>{t('open settings label', { ns: NAVTREE_PLUGIN })}</span>
              <GearSix className={mx(getSize(4), 'rotate-90')} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content classNames='z-[70]'>
              {t('open settings label', { ns: NAVTREE_PLUGIN })}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    </div>
  );
};
