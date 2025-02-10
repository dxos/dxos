//
// Copyright 2024 DXOS.org
//

import { formatDistance } from 'date-fns/formatDistance';
import React from 'react';

import { SettingsAction, useIntentDispatcher, createIntent, usePluginManager } from '@dxos/app-framework';
import { useConfig } from '@dxos/react-client';
import {
  Button,
  Link,
  Message,
  Popover,
  Tooltip,
  Trans,
  useSidebars,
  useTranslation,
  Icon,
  IconButton,
} from '@dxos/react-ui';
import { LayoutControls } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { NAVTREE_PLUGIN } from '../meta';

const buttonStyles = '!pli-1.5 text-xs font-normal';

const repo = 'https://github.com/dxos/dxos';

const VERSION_REGEX = /([\d.]+)/;

export const NavTreeFooter = (props: { reverse?: boolean }) => {
  const config = useConfig();
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { navigationSidebarOpen } = useSidebars(NAVTREE_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};
  const manager = usePluginManager();
  const [_, v] = version?.match(VERSION_REGEX) ?? [];

  const releaseUrl =
    config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'production'
      ? `${repo}/releases/tag/v${version}`
      : `${repo}/commit/${commitHash}`;

  const previewUrl = 'https://docs.dxos.org/composer#technology-preview';

  return (
    <div
      role='none'
      className={mx(
        'flex pbe-[env(safe-area-inset-bottom)] box-content justify-end',
        props.reverse && 'md:justify-end flex-row-reverse',
      )}
    >
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button variant='ghost' classNames={buttonStyles} {...(!navigationSidebarOpen && { tabIndex: -1 })}>
            v{v}
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
                <Icon icon='ph--warning--duotone' size={6} classNames='inline mie-2' />
                <span>{t('warning title')}</span>
              </Message.Title>
              <Message.Body>
                {t('technology preview message')}
                <br />
                <Link href={previewUrl} target='_blank' rel='noreferrer' variant='neutral'>
                  {t('learn more label')}
                  <Icon icon='ph--arrow-square-out--bold' classNames='inline mis-1' />
                </Link>
              </Message.Body>
            </Message.Root>
            <div role='none' className='plb-4 pli-5 space-b-2 text-baseText'>
              {timestamp && (
                <p>
                  {t('released message', {
                    released: formatDistance(new Date(timestamp), new Date(), { addSuffix: true }),
                  })}
                  <br />
                  <Link href={releaseUrl} target='_blank' rel='noreferrer' variant='neutral'>
                    {t('see release label')}
                    <Icon icon='ph--arrow-square-out--bold' classNames='inline mis-1' />
                  </Link>
                </p>
              )}
              <p>
                <Trans
                  {...{
                    t,
                    i18nKey: 'powered by dxos message',
                    components: {
                      dxos: <Link href='https://dxos.org' target='_blank' rel='noreferrer' variant='neutral' />,
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
          <IconButton
            icon='ph--gear-six--regular'
            iconOnly
            label={t('open settings label')}
            size={4}
            variant='ghost'
            classNames={buttonStyles}
            data-testid='treeView.openSettings'
            data-joyride='welcome/settings'
            {...(!navigationSidebarOpen && { tabIndex: -1 })}
            iconClassNames='rotate-90'
            onClick={() => dispatch(createIntent(SettingsAction.Open))}
          />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content classNames='z-[12]'>
            {t('open settings label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* NOTE(thure): Unpinning from the NavTree’s default position in Deck is temporarily disabled. */}
      {manager.enabled.includes('dxos.org/plugin/deck') && (
        <LayoutControls
          variant='hide-disabled'
          capabilities={{
            incrementStart: false,
            incrementEnd: false,
          }}
          onClick={(_type) => {
            // TODO(Zan): If we inmplement pinning again, we should dispatch here.
          }}
        />
      )}
    </div>
  );
};
