//
// Copyright 2024 DXOS.org
//

import { ArrowSquareOut, GearSix, Warning } from '@phosphor-icons/react';
import { formatDistance } from 'date-fns/formatDistance';
import React from 'react';

import {
  type LayoutPart,
  SettingsAction,
  parseNavigationPlugin,
  useResolvePlugin,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { useConfig } from '@dxos/react-client';
import {
  Button,
  Link,
  Message,
  Popover,
  Tooltip,
  Trans,
  useDefaultValue,
  useSidebars,
  useTranslation,
} from '@dxos/react-ui';
import { PlankHeading } from '@dxos/react-ui-stack/next';
import { getSize, mx } from '@dxos/react-ui-theme';

import { NAVTREE_PLUGIN } from '../meta';

const buttonStyles = 'pli-1.5 text-xs font-normal';

const repo = 'https://github.com/dxos/dxos';

const VERSION_REGEX = /([\d.]+)/;

export const NavTreeFooter = (props: { layoutPart?: LayoutPart }) => {
  const layoutPart = useDefaultValue(props.layoutPart, () => 'sidebar');
  const config = useConfig();
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { navigationSidebarOpen } = useSidebars(NAVTREE_PLUGIN);
  const dispatch = useIntentDispatcher();
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};
  const navigationPlugin = useResolvePlugin(parseNavigationPlugin);
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
        'flex bs-[--rail-size] pbe-[env(safe-area-inset-bottom)] box-content justify-end',
        layoutPart === 'complementary' && 'md:justify-end flex-row-reverse',
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
                <Warning weight='duotone' className='inline mie-2 is-6 bs-6' />
                <span>{t('warning title')}</span>
              </Message.Title>
              <Message.Body>
                {t('technology preview message')}
                <br />
                <Link href={previewUrl} target='_blank' rel='noreferrer' variant='neutral'>
                  {t('learn more label')}
                  <ArrowSquareOut className='inline mis-1' weight='bold' />
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

      {/* NOTE(thure): Unpinning from the NavTree’s default position in Deck is temporarily disabled. */}
      {navigationPlugin?.meta.id === 'dxos.org/plugin/deck' && (
        <PlankHeading.Controls
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
