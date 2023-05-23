//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { Button, DensityProvider, ThemeContext, useThemeContext, useTranslation } from '@dxos/aurora';
import { osTx } from '@dxos/aurora-theme';
import type { Identity } from '@dxos/client';
import { Avatar } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';

export const IdentityPanel = ({
  identity,
  onClickManageProfile,
}: {
  identity: Identity;
  onClickManageProfile?: () => void;
}) => {
  const { t } = useTranslation('os');
  const client = useClient();
  const themeContextValue = useThemeContext();

  const defaultManageProfile = () => {
    const remoteSource = new URL(client?.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');
    const tab = window.open(remoteSource.origin, '_blank');
    tab?.focus();
  };
  return (
    <ThemeContext.Provider value={{ ...themeContextValue, tx: osTx }}>
      <DensityProvider density='fine'>
        <div className='flex flex-col gap-2 justify-center items-center'>
          <Avatar
            size={16}
            variant='circle'
            fallbackValue={identity.identityKey.toHex()}
            label={identity.profile?.displayName ?? ''}
          />
          <Button onClick={onClickManageProfile ?? defaultManageProfile} classNames='is-full'>
            {t('manage profile label')}
          </Button>
        </div>
      </DensityProvider>
    </ThemeContext.Provider>
  );
};
