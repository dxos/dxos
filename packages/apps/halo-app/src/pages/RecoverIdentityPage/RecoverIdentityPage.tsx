//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import { Heading, SingleInputStep, useTranslation } from '@dxos/react-uikit';

export const RecoverIdentityPage = () => {
  const { t } = useTranslation();
  const client = useClient();
  const [seedphrase, setSeedphrase] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/spaces';
  const onNext = useCallback(() => {
    setPending(true);
    void client.halo.createProfile({ seedphrase }).then(
      () => navigate(redirect),
      (_rejection) => setPending(false)
    );
  }, [seedphrase]);
  return (
    <main className='max-is-5xl mli-auto pli-7 mbs-7'>
      <Heading>{t('recover identity label', { ns: 'uikit' })}</Heading>
      <SingleInputStep
        {...{
          pending,
          inputLabel: t('seed phrase label', { ns: 'uikit' }),
          inputPlaceholder: t('seed phrase placeholder', { ns: 'uikit' }),
          onChange: setSeedphrase,
          onNext,
          onBack: () => history.back()
        }}
      />
    </main>
  );
};
