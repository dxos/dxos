//
// Copyright 2021 DXOS.org
//

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Client, Party } from '@dxos/client';
import { useProfile } from '@dxos/react-client';
import {
  AuthChoices,
  Button,
  Heading,
  Main,
  QrCode,
  useTranslation
} from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface RegistrationPageProps {
  onRegister?: (client: Client) => Promise<Party>
}

/**
 * Allows user to create an identity, join an existing identity or unlock their current identity.
 */
export const LockPage = () => {
  const { t } = useTranslation('halo');
  const profile = useProfile();

  const navigate = useNavigate();

  const handleUnlock = useCallback(() => {
    navigate('/spaces');
  }, []);

  return (
    <Main className='max-w-lg mx-auto'>
      <div role='none' className='text-center space-y-2'>
        <QrCode value='https://halo.dxos.org' label={t('copy qrcode label')} />
        <Heading>{t('halo label')}</Heading>
      </div>

      {profile ? (
        <>
          <p className='text-center'>
            {t('using halo as message', {
              displayName: profile.username ?? humanize(profile.publicKey)
            })}
          </p>
        </>
      ) : (
        <>
          <p className='text-center'>{t('identities empty message')}</p>
          <AuthChoices
            {...{
              onInviteDevice: () => navigate('/profile/invite-device'),
              onCreate: () => navigate('/profile/create'),
              onRecover: () => navigate('/profile/recover')
            }}
          />
        </>
      )}

      <div role='none' className='text-center px-2 space-y-2'>
        {profile && <Button className='w-full' variant='primary' onClick={handleUnlock}>{t('unlock label')}</Button>}
        <Button
          variant='outline'
          className='w-full'
          onClick={() => window.open('https://github.com/dxos/dxos', '_blank')}
        >
          {t('generic help label', { ns: 'uikit' })}
        </Button>
      </div>
    </Main>
  );
};
