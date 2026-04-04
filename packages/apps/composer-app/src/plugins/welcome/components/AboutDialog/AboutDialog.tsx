//
// Copyright 2025 DXOS.org
//

import { formatDistance } from 'date-fns';
import React from 'react';

import { Button, Column, Dialog, Link, Trans, useTranslation } from '@dxos/react-ui';
import { useConfig } from '@dxos/react-client';

import { meta } from '../../meta';

const VERSION_REGEX = /([\d.]+)/;

export const ABOUT_DIALOG = `${meta.id}.component.about-dialog`;

export const AboutDialog = () => {
  const { t } = useTranslation(meta.id);
  const config = useConfig();
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};
  const [_, v] = version?.match(VERSION_REGEX) ?? [];

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
      <Dialog.Body>
        {/* TODO(burdon): Reconcile with plugin-status-bar */}
        <Column.Content classNames='flex flex-col text-sm'>
          <div role='none' className='flex items-center'>
            {t('version.label', { version: v })}
          </div>
          {timestamp && (
            <div role='none' className='flex items-center gap-1'>
              {t('published.label', {
                timestamp: formatDistance(new Date(timestamp), new Date(), { addSuffix: true }),
              })}
            </div>
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
        </Column.Content>
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <Button variant='primary'>{t('close.label')}</Button>
        </Dialog.Close>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};
