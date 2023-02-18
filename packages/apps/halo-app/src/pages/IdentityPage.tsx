//
// Copyright 2022 DXOS.org
//

import { Activity, Eraser } from 'phosphor-react';
import React, { ChangeEvent, useCallback } from 'react';

import { BASE_TELEMETRY_PROPERTIES, getTelemetryIdentifier, isTelemetryDisabled } from '@dxos/react-appkit';
import { useClient, useIdentity } from '@dxos/react-client';
import { useTranslation, Button, getSize, Input, Avatar, defaultGroup } from '@dxos/react-components';
import * as Telemetry from '@dxos/telemetry';
import { humanize } from '@dxos/util';

import { namespace } from '../App';
import { AlertDialog } from '../components';

const IdentityPage = () => {
  const client = useClient();
  const profile = useIdentity();
  const profileHex = profile!.identityKey.toHex();
  const telemetryDisabled = isTelemetryDisabled(namespace);
  const { t } = useTranslation('halo');

  const confirmString = humanize(profile!.identityKey.toHex());

  const onChangeDisplayName = useCallback(
    ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
      if (profile) {
        // TODO(thure): This doesn't appear to be a property with a setter, and I can't find a setter method for this, but it does persist at least in memory.
        profile.displayName = value;
      }
    },
    [profile]
  );

  return (
    <div role='none' className='flex flex-col items-center gap-2 max-is-lg mli-auto pli-7 pbs-4'>
      {/* TODO(wittjosiah): Update with device invite. */}
      <Avatar
        size={32}
        variant='circle'
        fallbackValue={profileHex}
        label={profile?.displayName ?? humanize(profileHex)}
        slots={{ root: { className: defaultGroup({ elevation: 'group', spacing: 'p-1', rounding: 'rounded-full' }) } }}
      />
      <Input
        label={t('displayName label', { ns: 'appkit' })}
        placeholder={humanize(profileHex)}
        defaultValue={profile?.displayName}
        onChange={onChangeDisplayName}
        slots={{ root: { className: 'w-full' } }}
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
        cancelTrigger={<Button>{t('cancel label', { ns: 'appkit' })}</Button>}
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
        cancelTrigger={<Button>{t('cancel label', { ns: 'appkit' })}</Button>}
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
    </div>
  );
};

export default IdentityPage;
