//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { AuthChoices } from '@dxos/react-appkit';
import { useIdentity, useSpaces } from '@dxos/react-client';
import { Heading, useTranslation } from '@dxos/react-components';

// NOTE: Copied from halo-app.
// TODO(wittjosiah): Utilize @dxos/react-ui patterns.

export const InitPage = () => {
  const { t } = useTranslation('kai');
  const navigate = useNavigate();
  const profile = useIdentity();
  const spaces = useSpaces();

  if (profile) {
    return <Navigate to={`/${spaces[0].key.truncate()}`} />;
  }

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7 space-b-6'>
      <div role='none' className='flex flex-col gap-2 items-center'>
        <Heading className='text-center'>{t('current app name')}</Heading>
        <p className='text-center'>{t('identities empty message')}</p>
        <AuthChoices
          {...{
            onJoin: () => navigate('/identity/join'),
            onCreate: () => navigate('/identity/create'),
            onRecover: () => navigate('/identity/recover')
          }}
        />
      </div>
    </main>
  );
};
