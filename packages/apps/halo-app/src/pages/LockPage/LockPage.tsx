//
// Copyright 2021 DXOS.org
//

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Client, Party } from '@dxos/client';
import { useIdentity } from '@dxos/react-client';
import { AuthChoices, Button, Heading, QrCode, useTranslation } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface RegistrationPageProps {
  onRegister?: (client: Client) => Promise<Party>;
}

/**
 * Allows user to create an identity, join an existing identity or unlock their current identity.
 */
export const LockPage = () => {
  const { t } = useTranslation('halo');
  const profile = useIdentity();

  const navigate = useNavigate();

  const handleUnlock = useCallback(() => {
    navigate('/spaces');
  }, []);

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7 space-b-6'>
      <div role='none' className='text-center space-b-2'>
        <QrCode
          value='https://halo.dxos.org'
          label={<p className='max-w-[4.5rem]'>{t('copy qrcode label')}</p>}
          side='left'
        />
        <Heading>{t('halo label')}</Heading>
      </div>

      {profile ? (
        <>
          <p className='text-center'>
            {t('using halo as message', {
              displayName: profile.displayName ?? humanize(profile.identityKey)
            })}
          </p>
        </>
      ) : (
        <>
          <p className='text-center'>{t('identities empty message')}</p>
          <AuthChoices
            {...{
              onJoin: () => navigate('/identity/join'),
              onCreate: () => navigate('/identity/create'),
              onRecover: () => navigate('/identity/recover')
            }}
          />
        </>
      )}

      <div role='none' className='text-center px-2 space-b-2'>
        {profile && (
          <Button className='w-full' variant='primary' onClick={handleUnlock}>
            {t('unlock label')}
          </Button>
        )}
        <Button
          variant='outline'
          className='w-full'
          onClick={() => window.open('https://github.com/dxos/dxos', '_blank')}
        >
          {t('generic help label', { ns: 'uikit' })}
        </Button>
      </div>
    </main>
  );
};
