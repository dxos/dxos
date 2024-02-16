//
// Copyright 2024 DXOS.org
//

import { ArrowSquareOut, GearSix, Warning } from '@phosphor-icons/react';
import { formatDistance } from 'date-fns/formatDistance';
import React from 'react';

import { SettingsAction, useIntent } from '@dxos/app-framework';
import { useConfig } from '@dxos/react-client';
import { Button, Tooltip, Popover, useSidebars, useTranslation, useThemeContext, Link, Message } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { NAVTREE_PLUGIN } from '../meta';

const buttonStyles = 'pli-1.5 border-bs-4 border-be-4 border-transparent bg-clip-padding text-xs font-normal';

const repo = 'https://github.com/dxos/dxos';

export const NavTreeFooter = () => {
  const config = useConfig();
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { navigationSidebarOpen } = useSidebars(NAVTREE_PLUGIN);
  const { dispatch } = useIntent();
  const { tx } = useThemeContext();
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};

  const releaseUrl =
    config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'development'
      ? `${repo}/releases/tag/v${version}`
      : `${repo}/commit/${commitHash}`;

  return (
    <div role='none' className='bs-[--rail-size] box-content separator-separator border-bs pli-1 flex justify-end'>
      <div role='none' className='grid grid-cols-[repeat(2,minmax(var(--rail-action),min-content))]'>
        <Popover.Root>
          <Popover.Trigger asChild>
            {/* TODO(burdon): Reconcile with action created by LayoutPlugin. */}
            <Button variant='ghost' classNames={buttonStyles} {...(!navigationSidebarOpen && { tabIndex: -1 })}>
              v{version}
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content side='top' role='message' classNames='z-[12] bg-warning-500 max-is-prose'>
              <Message.Root valence='warning' className='rounded-be-none'>
                <Message.Title>
                  <Warning weight='duotone' className='inline mie-2 is-5 bs-5' />
                  <span>{t('data loss message')}</span>
                </Message.Title>
                <Message.Body>
                  {t('technology preview message')}
                  <br />
                  <Link href='https://docs.dxos.org/composer#technology-preview' target='_blank' rel='noreferrer'>
                    {t('learn more label')}
                    <ArrowSquareOut className='inline mis-1' weight='bold' />
                  </Link>
                </Message.Body>
              </Message.Root>
              {timestamp && (
                <p className='text-sm p-4'>
                  {t('released message', {
                    released: formatDistance(new Date(timestamp), new Date(), { addSuffix: true }),
                  })}
                  <br />
                  <Link href={releaseUrl} target='_blank' rel='noreferrer'>
                    {t('see release label')}
                    <ArrowSquareOut className='inline mis-1' weight='bold' />
                  </Link>
                </p>
              )}
              <Popover.Arrow />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            {/* TODO(burdon): Reconcile with action created by LayoutPlugin. */}
            <Button
              variant='ghost'
              classNames={buttonStyles}
              data-testid='treeView.openSettings'
              data-joyride='welcome/settings'
              {...(!navigationSidebarOpen && { tabIndex: -1 })}
              onClick={() => dispatch({ action: SettingsAction.OPEN })}
            >
              <span className='sr-only'>{t('open settings label')}</span>
              <GearSix className={mx(getSize(4), 'rotate-90')} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content classNames='z-[12]'>
              {t('open settings label')}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    </div>
  );
};
