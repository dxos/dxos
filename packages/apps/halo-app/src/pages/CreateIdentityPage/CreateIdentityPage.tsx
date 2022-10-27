//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import {
  Main,
  Heading,
  SingleInputStep,
  useTranslation
} from '@dxos/react-uikit';

export const CreateIdentityPage = () => {
  const { t } = useTranslation();
  const client = useClient();
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/spaces';
  const onNext = useCallback(() => {
    setPending(true);
    void client.halo.createProfile({ username }).then(
      () => navigate(redirect),
      (_rejection) => setPending(false)
    );
  }, [username]);
  return (
    <Main className='max-w-lg mx-auto'>
      <Heading>{t('create identity label', { ns: 'uikit' })}</Heading>
      <SingleInputStep
        {...{
          pending,
          inputLabel: t('username label', { ns: 'uikit' }),
          inputPlaceholder: t('username placeholder', { ns: 'uikit' }),
          onChange: setUsername,
          onNext,
          onBack: () => history.back()
        }}
      />
    </Main>
  );
};
