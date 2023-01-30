//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { AuthChoices } from '@dxos/react-appkit';
import { useIdentity, useSpaces } from '@dxos/react-client';
import { Heading, useTranslation } from '@dxos/react-components';

import { createSpacePath } from '../hooks';

// NOTE: Copied from halo-app.
// TODO(wittjosiah): Utilize @dxos/react-ui patterns.

const InitPage = () => {
  const { t } = useTranslation('kai');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = encodeURIComponent(searchParams.get('redirect') ?? '');
  const profile = useIdentity();
  const spaces = useSpaces();

  if (profile) {
    // TODO(burdon): Better way to throw/display errors?
    if (!spaces.length) {
      throw new Error('No spaces.');
    }

    return <Navigate to={createSpacePath(spaces[0].key)} />;
  }

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7 space-b-6'>
      <div role='none' className='flex flex-col gap-2 items-center'>
        <Heading className='text-center'>{t('current app name')}</Heading>
        <p className='text-center'>{t('identities empty message')}</p>
        <AuthChoices
          {...{
            onJoin: () => navigate(`/identity/join?redirect=${redirect}`),
            onCreate: () => navigate(`/identity/create?redirect=${redirect}`),
            onRecover: () => navigate(`/identity/recover?redirect=${redirect}`)
          }}
        />
      </div>
    </main>
  );
};

export default InitPage;