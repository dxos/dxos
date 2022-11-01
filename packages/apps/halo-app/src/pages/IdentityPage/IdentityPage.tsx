//
// Copyright 2022 DXOS.org
//

import { Eraser } from 'phosphor-react';
import React, { useState } from 'react';

import { useClient, useProfile } from '@dxos/react-client';
import { QrCode, useTranslation, Button, getSize, Input } from '@dxos/react-uikit';

export const IdentityPage = () => {
  const client = useClient();
  const profile = useProfile();
  const [username, setUsername] = useState(profile?.username ?? '');
  const { t } = useTranslation('halo');

  return (
    <main className='flex flex-col items-center max-is-5xl mli-auto pli-7'>
      {/* TODO(wittjosiah): Update with device invite. */}
      <QrCode label={t('copy qrcode label')} value='https://halo.dxos.org' side='left' />
      <Input
        label={t('username label', { ns: 'uikit' })}
        initialValue={username}
        onChange={(nextValue) => setUsername(nextValue)}
        className='w-full'
      />
      {/* TODO(wittjosiah): Allow updating username. */}
      {/* {username !== profile?.username && (
          <Button
            variant='outlined'
            fullWidth
            onClick={() => client.halo.setGlobalPreference('username', username)}
          >Update</Button>
        )} */}
      <Button
        variant='outline'
        className='flex gap-1 w-full'
        onClick={async () => {
          await client.reset();
          window.location.reload();
        }}
      >
        <Eraser className={getSize(5)} />
        {t('reset device label')}
      </Button>
    </main>
  );
};
