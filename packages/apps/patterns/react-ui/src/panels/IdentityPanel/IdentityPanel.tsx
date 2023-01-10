//
// Copyright 2023 DXOS.org
//
import React from 'react';

import type { Profile } from '@dxos/client';
import { Avatar, Button, useTranslation } from '@dxos/react-components';

export const IdentityPanel = ({ identity }: { identity: Profile }) => {
  const { t } = useTranslation('os');
  return (
    <div className='flex flex-col gap-2 justify-center items-center'>
      <Avatar
        size={16}
        variant='circle'
        fallbackValue={identity.identityKey.toHex()}
        label={identity.displayName ?? ''}
      />
      <Button>{t('manage profile label')}</Button>
    </div>
  );
};
