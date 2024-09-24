//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@dxos/plugin-settings';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { useClient } from '@dxos/react-client';
import { Button, useTranslation } from '@dxos/react-ui';

import { SCRIPT_PLUGIN } from '../../meta';
import { type ScriptSettingsProps } from '../../types';

export const ScriptSettings = ({ settings }: { settings: ScriptSettingsProps }) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const client = useClient();

  // TODO(burdon): Check token.
  const handleAuthenticate = async () => {
    const { identityKey } = client.halo.identity.get()!;
    await client.halo.writeCredentials([
      {
        issuer: identityKey,
        issuanceDate: new Date(),
        subject: {
          id: identityKey,
          assertion: {
            '@type': 'dxos.halo.credentials.ServiceAccess',
            serverName: 'hub.dxos.network',
            serverKey: identityKey,
            identityKey,
            capabilities: ['composer:beta'],
          },
        },
      } satisfies Credential,
    ]);
  };

  return (
    <>
      <SettingsValue label={t('authenticate action label')}>
        <Button onClick={handleAuthenticate}>{t('authenticate button label')}</Button>
      </SettingsValue>
    </>
  );
};
