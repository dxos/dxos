//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { SingleInputStep } from '@dxos/react-appkit';
import { useClient, useIdentity } from '@dxos/react-client';
import { Heading, useTranslation } from '@dxos/react-ui';

const RecoverIdentityPage = () => {
  const { t } = useTranslation();
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
    [redirectUrl]
  );

  const onNext = useCallback(() => {
    setPending(true);
    void client.halo.createProfile({ seedphrase }).then(redirect, (_rejection) => setPending(false));
  }, [seedphrase, redirect]);

  useEffect(() => {
    if (identity) {
      redirect();
    }
  }, []);

  return (
    <main className='max-is-5xl mli-auto pli-7 mbs-7'>
      <Heading>{t('recover identity label', { ns: 'appkit' })}</Heading>
      <SingleInputStep
        {...{
          pending,
          inputLabel: t('seed phrase label', { ns: 'appkit' }),
          inputPlaceholder: t('seed phrase placeholder', { ns: 'appkit' }),
          onChange: setSeedphrase,
          onNext,
          onBack: () => history.back()
        }}
      />
    </main>
  );
};

export default RecoverIdentityPage;
