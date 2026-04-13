//
// Copyright 2024 DXOS.org
//

import { formatDistance } from 'date-fns/formatDistance';
import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Icon, Link, Message, Popover, Trans, useTranslation } from '@dxos/react-ui';

import { StatusBar } from '#components';
import { meta } from '#meta';

export type VersionNumberProps = {};

const repo = 'https://github.com/dxos/dxos';

const VERSION_REGEX = /([\d.]+)/;

export const VersionNumber = (_props: VersionNumberProps) => {
  const { t } = useTranslation(meta.id);
  const config = useConfig();
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
        <StatusBar.Button classNames='h-full text-xs'>{v}</StatusBar.Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='top' role='message' classNames='z-[12] max-w-[min(calc(100vw-16px),40ch)]'>
          <Message.Root valence='info' classNames='rounded-b-none p-4'>
            <Message.Title>{t('warning.title')}</Message.Title>
            <Message.Content>
              {t('technology-preview.message')}
              <br />
              <Link href={previewUrl} target='_blank' rel='noreferrer' variant='neutral'>
                {t('learn-more.label')}
                <Icon icon='ph--arrow-square-out--bold' classNames='dx-icon-inline ms-1' />
              </Link>
            </Message.Content>
          </Message.Root>
          <div role='none' className='flex flex-col ps-9 pe-4 py-2 gap-1 space-b-2 text-base-surface-text'>
            {timestamp && (
              <div>
                <p>
                  {t('released.message', {
                    released: formatDistance(new Date(timestamp), new Date(), { addSuffix: true }),
                  })}
                </p>
                <div>
                  <span className='dx-tag dx-tag--neutral -ml-1'>{version}</span>
                </div>
              </div>
            )}
            <div>
              <p>
                {t('see-release.label')}
                <Link classNames='' href={releaseUrl} target='_blank' rel='noreferrer' variant='neutral'>
                  <Icon icon='ph--arrow-square-out--bold' size={4} classNames='dx-icon-inline ms-1' />
                </Link>
              </p>
              <p>
                <Trans
                  {...{
                    t,
                    i18nKey: 'powered-by-dxos.message',
                    components: {
                      dxos: (
                        <Link
                          classNames='text-green-500'
                          href='https://dxos.org'
                          target='_blank'
                          rel='noreferrer'
                          variant='neutral'
                        />
                      ),
                    },
                  }}
                />
              </p>
            </div>
          </div>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
