//
// Copyright 2023 DXOS.org
//
import React from 'react';

import type { Profile } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { Avatar, Button, ThemeContext, useTranslation } from '@dxos/react-components';

export const IdentityPanel = ({
  identity,
  onClickManageProfile
}: {
  identity: Profile;
  onClickManageProfile?: () => void;
}) => {
  const { t } = useTranslation('os');
  const client = useClient();
  const defaultManageProfile = () => {
    const remoteSource = new URL(client?.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');
    const tab = window.open(remoteSource.origin, '_blank');
    tab?.focus();
  };
  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <div className='flex flex-col gap-2 justify-center items-center'>
        <Avatar
          size={16}
          variant='circle'
          fallbackValue={identity.identityKey.toHex()}
          label={identity.displayName ?? ''}
        />
        <Button compact onClick={onClickManageProfile ?? defaultManageProfile} className='is-full'>
          {t('manage profile label')}
        </Button>
      </div>
    </ThemeContext.Provider>
  );
};
