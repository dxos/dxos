//
// Copyright 2022 DXOS.org
//

import { Activity, Eraser } from '@phosphor-icons/react';
import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';

import { useTranslation, Button } from '@dxos/aurora';
import { getSize, group } from '@dxos/aurora-theme';
import { Input, Avatar } from '@dxos/react-appkit';
import {
  BASE_TELEMETRY_PROPERTIES,
  getTelemetryIdentifier,
  isTelemetryDisabled,
  storeTelemetryDisabled,
} from '@dxos/react-appkit/telemetry';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import * as Telemetry from '@dxos/telemetry';
import { humanize } from '@dxos/util';

import { AlertDialog } from '../components';
import { namespace } from '../util';

const IdentityPage = () => {
  const client = useClient();
  const identity = useIdentity();
  const identityHex = identity!.identityKey.toHex();
  // TODO(wittjosiah): Loading state.
  const [telemetryDisabled, setTelemetryDisabled] = useState(false);
  const { t } = useTranslation('halo');

  const confirmString = humanize(identity!.identityKey.toHex());

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setTelemetryDisabled(await isTelemetryDisabled(namespace));
    });

    return () => clearTimeout(timeout);
  }, []);

  const onChangeDisplayName = useCallback(
    ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
      if (identity?.profile) {
        // TODO(thure): This doesn't appear to be a property with a setter, and I can't find a setter method for this, but it does persist at least in memory.
        identity.profile.displayName = value;
      }
    },
    [identity],
  );

  return (
    <div role='none' className='flex flex-col items-center gap-2 max-is-lg mli-auto pli-7 pbs-4'>
      {/* TODO(wittjosiah): Update with device invite. */}
      <Avatar
        size={32}
        variant='circle'
        fallbackValue={identityHex}
        label={identity?.profile?.displayName ?? humanize(identityHex)}
        slots={{ root: { classNames: [group({ elevation: 'group' }), 'p-1 rounded-full'] } }}
      />
      <Input
        label={t('displayName label', { ns: 'appkit' })}
        placeholder={humanize(identityHex)}
        defaultValue={identity?.profile?.displayName}
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
          <Button variant='outline' classNames='flex gap-1 w-full'>
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
                  value: !telemetryDisabled,
                },
              });
              void storeTelemetryDisabled(namespace, String(!telemetryDisabled));
              window.location.reload();
            }}
            classNames='text-error-700 dark:text-error-400'
          >
            {telemetryDisabled ? t('enable telemetry label') : t('disable telemetry label')}
          </Button>
        }
      />
      <AlertDialog
        title={t('reset device label')}
        openTrigger={
          <Button variant='outline' classNames='flex gap-1 w-full'>
            <Eraser className={getSize(5)} />
            {t('reset device label')}
          </Button>
        }
        destructiveConfirmString={confirmString}
        destructiveConfirmInputProps={{
          label: t('confirm reset device label', { confirmString }),
        }}
        cancelTrigger={<Button>{t('cancel label', { ns: 'appkit' })}</Button>}
        confirmTrigger={
          <Button
            onClick={async () => {
              await client.reset();
              window.location.reload();
            }}
            classNames='text-error-700 dark:text-error-400'
          >
            {t('reset device label')}
          </Button>
        }
      />
    </div>
  );
};

export default IdentityPage;
