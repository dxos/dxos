//
// Copyright 2025 DXOS.org
//

import { formatDistance } from 'date-fns';
import React from 'react';

import { useConfig } from '@dxos/react-client';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Theme from '@dxos/react-ui/Theme';
import * as Typography from '@dxos/react-ui/Typography';

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
  const { t } = Hooks.useTranslation(meta.profile.key);
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
    <Dialog.Content size='sm'>
      <Dialog.Header classNames='pb-3'>
        <Dialog.Title asChild>
          <h1 className="font-['Poiret One'] text-5xl" style={{ fontFamily: 'Poiret One' }}>
            composer
          </h1>
        </Dialog.Title>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <div className='flex items-center text-fg-muted'>{t('version.label', { version: version ?? 'unknown' })}</div>
        <div className='flex flex-col gap-3'>
          {timestamp && (
            <div className='flex items-center gap-1'>
              <Typography.Link href={releaseUrl} variant='neutral'>
                {t('published.label', {
                  timestamp: formatDistance(new Date(timestamp), new Date(), { addSuffix: true }),
                })}
              </Typography.Link>
            </div>
          )}
          {showEnv && <div className='flex items-center'>{t('environment.label', { environment: edgeEnv })}</div>}
          <p>
            <Theme.Trans
              {...{
                t,
                i18nKey: 'powered-by-dxos.message',
                components: {
                  dxos: <Typography.Link href='https://dxos.org' variant='neutral' />,
                },
              }}
            />
          </p>
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <Dialog.CloseTrigger asChild>
          <Button.Root variant='primary'>{t('close.label')}</Button.Root>
        </Dialog.CloseTrigger>
      </Dialog.Footer>
    </Dialog.Content>
  );
};
