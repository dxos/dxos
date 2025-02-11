//
// Copyright 2024 DXOS.org
//

import { formatDistance } from 'date-fns/formatDistance';
import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Link, Message, Popover, Trans, useTranslation, Icon } from '@dxos/react-ui';

import { StatusBar } from './StatusBar';
import { STATUS_BAR_PLUGIN } from '../meta';

const repo = 'https://github.com/dxos/dxos';

const VERSION_REGEX = /([\d.]+)/;

export const VersionNumber = () => {
  const config = useConfig();
  const { t } = useTranslation(STATUS_BAR_PLUGIN);
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};
  const [_, v] = version?.match(VERSION_REGEX) ?? [];

  const releaseUrl =
    config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'production'
      ? `${repo}/releases/tag/v${version}`
      : `${repo}/commit/${commitHash}`;

  const previewUrl = 'https://docs.dxos.org/composer#technology-preview';

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Button classNames='text-xs'>v{v}</StatusBar.Button>
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
  );
};
