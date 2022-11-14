//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import { Heading, SingleInputStep, useTranslation } from '@dxos/react-uikit';

export const CreateIdentityPage = () => {
  const { t } = useTranslation();
  const client = useClient();
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/spaces';
  const onNext = useCallback(() => {
    setPending(true);
    void client.halo.createProfile({ displayName }).then(
      () => (redirect.startsWith('http') ? window.location.replace(redirect) : navigate(redirect)),
      (_rejection) => setPending(false)
    );
  }, [displayName]);

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
