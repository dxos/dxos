//
// Copyright 2025 DXOS.org
//

import { formatDistance } from 'date-fns';
import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Next, Trans, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta.ts';

// Keyed by edge host, including legacy names still present in stored configs and installed builds.
const ENV_LABELS: Record<string, string> = {
  'dev.dxos.network': 'Dev',
  'preview.dxos.network': 'Preview',
  'dxos.network': 'Production',

  'edge.dxos.workers.dev': 'Dev',
  'edge-preview.dxos.workers.dev': 'Preview',
  'edge-main.dxos.workers.dev': 'Main (retired)',
  'edge-labs.dxos.workers.dev': 'Labs (retired)',
  'edge-staging.dxos.workers.dev': 'Staging',
  'edge-production.dxos.workers.dev': 'Production',
  'main.dxos.network': 'Preview',
  'labs.dxos.network': 'Labs (retired)',
  'staging.dxos.network': 'Staging',
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

export const AboutDialog = () => {
  const { t } = useTranslation(meta.profile.key);
  const config = useConfig();
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};

  // Show edge environment when not in production, so internal builds advertise which cluster they're on.
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  const envKey = edgeUrl ? parseUrl(edgeUrl)?.host : undefined;
  const edgeEnv = envKey ? ENV_LABELS[envKey] : undefined;
  const showEnv = !!edgeEnv && edgeEnv !== 'Production';

  // Fall back to repo root when build metadata is missing so we never produce broken
  // links like `/releases/tag/vundefined` or `/commit/undefined`.
  const isProd = config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'production';
  const releaseUrl =
    isProd && version ? `${REPO}/releases/tag/v${version}` : commitHash ? `${REPO}/commit/${commitHash}` : REPO;

  return (
    <Next.Dialog.Content size='sm'>
      <Next.Dialog.Header>
        <Next.Dialog.Title asChild>
          <h1 className="font-['Poiret One'] text-5xl" style={{ fontFamily: 'Poiret One' }}>
            composer
          </h1>
        </Next.Dialog.Title>
        <Next.Dialog.CloseTrigger asChild>
          <Next.SystemButton.Close />
        </Next.Dialog.CloseTrigger>
      </Next.Dialog.Header>
      <Next.Dialog.Body>
        <div className='flex items-center text-description'>
          {t('version.label', { version: version ?? 'unknown' })}
        </div>
        <div className='flex flex-col gap-3'>
          {timestamp && (
            <div className='flex items-center gap-1'>
              <Next.Link href={releaseUrl} variant='neutral'>
                {t('published.label', {
                  timestamp: formatDistance(new Date(timestamp), new Date(), { addSuffix: true }),
                })}
              </Next.Link>
            </div>
          )}
          {showEnv && <div className='flex items-center'>{t('environment.label', { environment: edgeEnv })}</div>}
          <p>
            <Trans
              {...{
                t,
                i18nKey: 'powered-by-dxos.message',
                components: {
                  dxos: <Next.Link href='https://dxos.org' variant='neutral' />,
                },
              }}
            />
          </p>
        </div>
      </Next.Dialog.Body>
      <Next.Dialog.Footer>
        <Next.Dialog.CloseTrigger asChild>
          <Next.Button variant='primary'>{t('close.label')}</Next.Button>
        </Next.Dialog.CloseTrigger>
      </Next.Dialog.Footer>
    </Next.Dialog.Content>
  );
};
