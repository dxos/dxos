//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useClient, useIdentity } from '@dxos/react-client';
import { Heading, SingleInputStep, useTranslation } from '@dxos/react-uikit';

export const CreateIdentityPage = () => {
  const { t } = useTranslation();
  const client = useClient();
  const identity = useIdentity();
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') ?? '/devices';
  const redirect = useCallback(
    () => (redirectUrl.startsWith('http') ? window.location.replace(redirectUrl) : navigate(redirectUrl)),
    [redirectUrl]
  );

  const onNext = useCallback(() => {
    setPending(true);
    void client.halo.createProfile({ displayName }).then(redirect, (_rejection) => setPending(false));
  }, [displayName, redirect]);

  useEffect(() => {
    if (identity) {
      redirect();
    }
  }, []);

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <Heading>{t('create identity label', { ns: 'uikit' })}</Heading>
      <SingleInputStep
        {...{
          pending,
          inputLabel: t('displayName label', { ns: 'uikit' }),
          inputPlaceholder: t('displayName placeholder', { ns: 'uikit' }),
          onChange: setDisplayName,
          onNext,
          onBack: () => history.back()
        }}
      />
    </main>
  );
};
