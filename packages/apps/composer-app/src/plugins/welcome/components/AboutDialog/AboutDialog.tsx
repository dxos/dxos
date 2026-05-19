//
// Copyright 2025 DXOS.org
//

import { formatDistance } from 'date-fns';
import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Button, Column, Dialog, Link, Message, Trans, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

const ENV_LABELS: Record<string, string> = {
  'edge-dev': 'Dev',
  'edge-main': 'Main',
  'edge-labs': 'Labs',
  'edge-production': 'Production',
};

const REPO = 'https://github.com/dxos/dxos';

export const ABOUT_DIALOG = `${meta.id}.component.about-dialog`;

export const AboutDialog = () => {
  const { t } = useTranslation(meta.id);
  const config = useConfig();
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};

  // Show edge environment when not in production, so internal builds advertise which cluster they're on.
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  const envKey = edgeUrl ? new URL(edgeUrl).host.split('.')[0] : undefined;
  const edgeEnv = envKey ? ENV_LABELS[envKey] : undefined;
  const showEnv = !!edgeEnv && edgeEnv !== 'Production';

  const releaseUrl =
    config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'production'
      ? `${REPO}/releases/tag/v${version}`
      : `${REPO}/commit/${commitHash}`;

  return (
    <Dialog.Content size='sm'>
      <Dialog.Header>
        <Dialog.Title asChild>
          <h1 className="font-['Poiret One'] text-5xl" style={{ fontFamily: 'Poiret One' }}>
            composer
          </h1>
        </Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body classNames='flex flex-col gap-3'>
        <Message.Root valence='info'>
          <Message.Title classNames='font-normal text-sm'>{t('technology-preview.message')}</Message.Title>
        </Message.Root>
        <Column.Center classNames='flex flex-col text-sm'>
          <div className='flex items-center'>{t('version.label', { version })}</div>
          {timestamp && (
            <div className='flex items-center gap-1'>
              <Link href={releaseUrl} target='_blank' rel='noopener noreferrer' variant='neutral'>
                {t('published.label', {
                  timestamp: formatDistance(new Date(timestamp), new Date(), { addSuffix: true }),
                })}
              </Link>
            </div>
          )}
          {showEnv && <div className='flex items-center'>{t('environment.label', { environment: edgeEnv })}</div>}
          <p>
            <Trans
              {...{
                t,
                i18nKey: 'powered-by-dxos.message',
                components: {
                  dxos: <Link href='https://dxos.org' target='_blank' rel='noopener noreferrer' variant='neutral' />,
                },
              }}
            />
          </p>
        </Column.Center>
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <Button variant='primary'>{t('close.label')}</Button>
        </Dialog.Close>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};
