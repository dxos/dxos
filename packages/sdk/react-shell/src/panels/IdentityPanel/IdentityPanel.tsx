//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { Avatar, Button, DensityProvider, useJdenticonHref, useTranslation } from '@dxos/aurora';
import { useClient } from '@dxos/react-client';
import type { Identity } from '@dxos/react-client/halo';

export const IdentityPanel = ({
  identity,
  onClickManageProfile,
}: {
  identity: Identity;
  onClickManageProfile?: () => void;
}) => {
  const { t } = useTranslation('os');
  const client = useClient();
  const defaultManageProfile = () => {
    const remoteSource = new URL(client?.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');
    const tab = window.open(remoteSource.origin, '_blank');
    tab?.focus();
  };
  const fallbackHref = useJdenticonHref(identity.identityKey.toHex(), 16);
  return (
    <DensityProvider density='fine'>
      <div role='none' className='flex flex-col gap-2 justify-center items-center'>
        <Avatar.Root size={16} variant='circle'>
          <Avatar.Frame>
            <Avatar.Fallback href={fallbackHref} />
          </Avatar.Frame>
          <Avatar.Label>{identity.profile?.displayName ?? ''}</Avatar.Label>
        </Avatar.Root>
        <Button onClick={onClickManageProfile ?? defaultManageProfile} classNames='is-full'>
          {t('manage profile label')}
        </Button>
      </div>
    </DensityProvider>
  );
};
