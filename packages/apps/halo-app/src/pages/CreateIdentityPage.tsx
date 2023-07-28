//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useTranslation } from '@dxos/aurora';
import { log } from '@dxos/log';
import { Heading, SingleInputStep } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

const CreateIdentityPage = () => {
  const { t } = useTranslation('appkit');
  const client = useClient();
  const identity = useIdentity();
  const [displayName, setDisplayName] = useState('');
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
    void client.halo.createIdentity({ displayName }).then(redirect, (rejection) => {
      log.catch(rejection);
      setPending(false);
    });
  }, [displayName, redirect]);

  useEffect(() => {
    if (identity) {
      redirect();
    }
  }, []);

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <Heading>{t('create identity label')}</Heading>
      <SingleInputStep
        {...{
          pending,
          inputLabel: t('displayName label'),
          inputPlaceholder: t('displayName placeholder'),
          onChange: ({ target: { value } }) => setDisplayName(value),
          onNext,
          onBack: () => history.back(),
        }}
      />
    </main>
  );
};

export default CreateIdentityPage;
