//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { SingleInputStep } from '@dxos/react-appkit';
import { useClient, useIdentity } from '@dxos/react-client';
import { Heading, useTranslation } from '@dxos/react-components';

import { useAppState } from '../hooks';
import { Generator } from '../proto';

// NOTE: Copied from halo-app.
// TODO(wittjosiah): Utilize @dxos/react-ui patterns.

const CreateIdentityPage = () => {
  const { t } = useTranslation('appkit');
  const { dev } = useAppState();
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
    [redirectUrl]
  );

  const onNext = useCallback(async () => {
    setPending(true);
    try {
      await client.halo.createProfile({ displayName });
      const space = await client.echo.createSpace();
      if (dev && !client.config.values.runtime?.client?.storage?.persistent) {
        await new Generator(space.db).generate();
      }

      redirect();
    } catch {
      setPending(false);
    }
  }, [displayName, redirect, dev]);

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
          onBack: () => history.back()
        }}
      />
    </main>
  );
};

export default CreateIdentityPage;
