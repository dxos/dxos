//
// Copyright 2024 DXOS.org
//

import { ArrowSquareOut, GearSix, Warning } from '@phosphor-icons/react';
import { formatDistance } from 'date-fns/formatDistance';
import React from 'react';

import { SettingsAction, NavigationAction, useIntent, type PartIdentifier } from '@dxos/app-framework';
import { useConfig } from '@dxos/react-client';
import { Button, Tooltip, Popover, useSidebars, useTranslation, Link, Message, Trans } from '@dxos/react-ui';
import { PlankHeading } from '@dxos/react-ui-deck';
import { getSize, mx } from '@dxos/react-ui-theme';

import { NAVTREE_PLUGIN } from '../meta';

const buttonStyles = 'pli-1.5 text-xs font-normal';

const repo = 'https://github.com/dxos/dxos';

export const NavTreeFooter = ({ part = ['sidebar', 0, 1] }: { part?: PartIdentifier }) => {
  const config = useConfig();
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { navigationSidebarOpen } = useSidebars(NAVTREE_PLUGIN);
  const { dispatch } = useIntent();
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};

  const releaseUrl =
    config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'production'
      ? `${repo}/releases/tag/v${version}`
      : `${repo}/commit/${commitHash}`;

  return (
    <div
      role='none'
      className={mx(
        'bs-[--rail-size] pbe-[env(safe-area-inset-bottom)] box-content separator-separator border-bs pli-1 flex justify-end',
        part[0] === 'complementary' && 'md:justify-end flex-row-reverse',
      )}
    >
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button variant='ghost' classNames={buttonStyles} {...(!navigationSidebarOpen && { tabIndex: -1 })}>
            v{version}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side='top'
            role='message'
            classNames='z-[12] bg-warning-500 max-is-[min(calc(100vw-16px),40ch)]'
          >
            <Message.Root valence='warning' className='rounded-be-none p-5'>
              <Message.Title>
                <Warning weight='duotone' className='inline mie-2 is-6 bs-6' />
                <span>{t('data loss message')}</span>
              </Message.Title>
              <Message.Body>
                {t('technology preview message')}
                <br />
                <Link
                  href='https://docs.dxos.org/composer#technology-preview'
                  target='_blank'
                  rel='noreferrer'
                  variant='neutral'
                >
                  {t('learn more label')}
                  <ArrowSquareOut className='inline mis-1' weight='bold' />
                </Link>
              </Message.Body>
            </Message.Root>
            <div role='none' className='plb-4 pli-5 space-b-2 text-base'>
              {timestamp && (
                <p>
                  {t('released message', {
                    released: formatDistance(new Date(timestamp), new Date(), { addSuffix: true }),
                  })}
                  <br />
                  <Link href={releaseUrl} target='_blank' rel='noreferrer' variant='neutral'>
                    {t('see release label')}
                    <ArrowSquareOut className='inline mis-1' weight='bold' />
                  </Link>
                </p>
              )}
              <p>
                <Trans
                  {...{
                    t,
                    i18nKey: 'powered by dxos message',
                    components: {
                      dxosLink: <Link href='https://dxos.org' target='_blank' rel='noreferrer' variant='neutral' />,
                    },
                  }}
                />
              </p>
            </div>
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

      <PlankHeading.Controls
        part={part}
        variant='hide-disabled'
        increment={part[0] === 'main'}
        pin={part[0] === 'sidebar' ? 'end' : part[0] === 'complementary' ? 'start' : 'both'}
        onClick={({ type, part }) => dispatch({ action: NavigationAction.ADJUST, data: { type, part } })}
      />
    </div>
  );
};
