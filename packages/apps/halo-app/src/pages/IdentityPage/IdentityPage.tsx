//
// Copyright 2022 DXOS.org
//

import { Activity, Eraser } from 'phosphor-react';
import React, { useState } from 'react';

import { BASE_TELEMETRY_PROPERTIES, DX_TELEMETRY, getTelemetryIdentifier } from '@dxos/react-appkit';
import { useClient, useIdentity } from '@dxos/react-client';
import { QrCode, useTranslation, Button, getSize, Input, AlertDialog } from '@dxos/react-uikit';
import * as Telemetry from '@dxos/telemetry';
import { humanize } from '@dxos/util';

export const IdentityPage = () => {
  const client = useClient();
  const profile = useIdentity();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const telemetryDisabled = DX_TELEMETRY === 'true';
  const { t } = useTranslation('halo');

  const confirmString = humanize(profile!.identityKey.toHex());

  return (
    <main className='flex flex-col items-center max-is-lg mli-auto pli-7'>
      {/* TODO(wittjosiah): Update with device invite. */}
      <QrCode label={t('copy qrcode label')} value='https://halo.dxos.org' side='left' />
      <Input
        label={t('displayName label', { ns: 'uikit' })}
        initialValue={displayName}
        onChange={(nextValue) => setDisplayName(nextValue)}
        className='w-full'
      />
      {/* TODO(wittjosiah): Allow updating displayName. */}
      {/* {displayName !== profile?.displayName && (
          <Button
            variant='outlined'
            fullWidth
            onClick={() => client.halo.setGlobalPreference('displayName', displayName)}
          >Update</Button>
        )} */}
      <AlertDialog
        title={telemetryDisabled ? t('enable telemetry label') : t('disable telemetry label')}
        description={telemetryDisabled ? t('enable telemetry description') : t('disable telemetry description')}
        openTrigger={
          <Button variant='outline' className='flex gap-1 w-full'>
            <Activity className={getSize(5)} />
            {telemetryDisabled ? t('enable telemetry label') : t('disable telemetry label')}
          </Button>
        }
        cancelTrigger={<Button>{t('cancel label', { ns: 'uikit' })}</Button>}
        confirmTrigger={
          <Button
            onClick={() => {
              Telemetry.event({
                identityId: getTelemetryIdentifier(client),
                name: 'halo-app:telemetry:toggle',
                properties: {
                  ...BASE_TELEMETRY_PROPERTIES,
                  value: !telemetryDisabled
                }
              });
              localStorage.setItem('halo-app:telemetry-disabled', String(!telemetryDisabled));
              window.location.reload();
            }}
            className='text-error-700 dark:text-error-400'
          >
            {telemetryDisabled ? t('enable telemetry label') : t('disable telemetry label')}
          </Button>
        }
      />
      <AlertDialog
        title={t('reset device label')}
        openTrigger={
          <Button variant='outline' className='flex gap-1 w-full'>
            <Eraser className={getSize(5)} />
            {t('reset device label')}
          </Button>
        }
        destructiveConfirmString={confirmString}
        destructiveConfirmInputProps={{
          label: t('confirm reset device label', { confirmString })
        }}
        cancelTrigger={<Button>{t('cancel label', { ns: 'uikit' })}</Button>}
        confirmTrigger={
          <Button
            onClick={async () => {
              await client.reset();
              window.location.reload();
            }}
            className='text-error-700 dark:text-error-400'
          >
            {t('reset device label')}
          </Button>
        }
      />
    </main>
  );
};
