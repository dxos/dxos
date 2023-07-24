//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useTranslation } from '@dxos/aurora';
import { Heading, SingleInputStep } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

const RecoverIdentityPage = () => {
  const { t } = useTranslation('appkit');
  const client = useClient();
  const identity = useIdentity();
  const [seedphrase, setSeedphrase] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const redirect = useCallback(
    () =>
      redirectUrl?.startsWith('http')
        ? window.location.replace(redirectUrl)
        : navigate(redirectUrl && redirectUrl.length ? redirectUrl : '/devices'),
    [redirectUrl],
  );

  const onNext = useCallback(() => {
    setPending(true);
    // TODO(mykola): Add seedphrase.
    void client.halo.createIdentity().then(redirect, (_rejection) => setPending(false));
  }, [seedphrase, redirect]);

  useEffect(() => {
    if (identity) {
      redirect();
    }
  }, []);

  return (
    <main className='max-is-5xl mli-auto pli-7 mbs-7'>
      <Heading>{t('recover identity label')}</Heading>
      <SingleInputStep
        {...{
          pending,
          inputLabel: t('seed phrase label'),
          inputPlaceholder: t('seed phrase placeholder'),
          onChange: ({ target: { value } }) => setSeedphrase(value),
          onNext,
          onBack: () => history.back(),
        }}
      />
    </main>
  );
};

export default RecoverIdentityPage;
