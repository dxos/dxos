//
// Copyright 2025 DXOS.org
//

import { formatDistance } from 'date-fns';
import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Button, Dialog, Link, Trans, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

const ENV_LABELS: Record<string, string> = {
  'edge-dev': 'Dev',
  'edge-main': 'Main',
  'edge-labs': 'Labs',
  'edge-production': 'Production',
};

const REPO = 'https://github.com/dxos/dxos';

/** Safe `new URL(...)` — returns the parsed URL or undefined when the input is malformed. */
const parseUrl = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

export const ABOUT_DIALOG = `${meta.id}.component.about-dialog`;

export const AboutDialog = () => {
  const { t } = useTranslation(meta.id);
  const config = useConfig();
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};

  // Show edge environment when not in production, so internal builds advertise which cluster they're on.
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  const envKey = edgeUrl ? parseUrl(edgeUrl)?.host.split('.')[0] : undefined;
  const edgeEnv = envKey ? ENV_LABELS[envKey] : undefined;
  const showEnv = !!edgeEnv && edgeEnv !== 'Production';

  // Fall back to repo root when build metadata is missing so we never produce broken
  // links like `/releases/tag/vundefined` or `/commit/undefined`.
  const isProd = config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'production';
  const releaseUrl =
    isProd && version ? `${REPO}/releases/tag/v${version}` : commitHash ? `${REPO}/commit/${commitHash}` : REPO;

  return (
    <Dialog.Content size='sm'>
      <Dialog.Header>
        <Dialog.Title asChild>
          <h1 className="font-['Poiret One'] text-5xl" style={{ fontFamily: 'Poiret One' }}>
            composer
          </h1>
        </Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <div className='flex items-center text-description'>
          {t('version.label', { version: version ?? 'unknown' })}
        </div>
        <div className='flex flex-col gap-3'>
          {timestamp && (
            <div className='flex items-center gap-1'>
              <Link href={releaseUrl} variant='neutral'>
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
                  dxos: <Link href='https://dxos.org' variant='neutral' />,
                },
              }}
            />
          </p>
        </div>
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <Button variant='primary'>{t('close.label')}</Button>
        </Dialog.Close>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};
