//
// Copyright 2021 DXOS.org
//

import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Client, Space } from '@dxos/client';
import { useIdentity } from '@dxos/react-client';
import {
  AuthChoices,
  Avatar,
  Button,
  defaultGroup,
  Heading,
  useTranslation,
  Trans,
  getSize,
  mx
} from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

import lightThemeLogo from '../../assets/icon-halo-black.png';
import darkThemeLogo from '../../assets/icon-halo-white.png';

export interface RegistrationPageProps {
  onRegister?: (client: Client) => Promise<Space>;
}

/**
 * Allows user to create an identity, join an existing identity or unlock their current identity.
 */
export const LockPage = () => {
  const { t } = useTranslation('halo');
  const profile = useIdentity();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = encodeURIComponent(searchParams.get('redirect') ?? '');

  const handleUnlock = useCallback(() => {
    navigate('/devices');
  }, []);

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7 space-b-6'>
      {profile ? (
        <div role='none' className='flex flex-col gap-2 items-center'>
          <Avatar
            size={32}
            variant='circle'
            fallbackValue={profile.identityKey.toHex()}
            label={profile.displayName ?? humanize(profile.identityKey)}
            slots={{ root: { className: defaultGroup({ elevation: 3, spacing: 'p-1', rounding: 'rounded-full' }) } }}
          />
          <Heading>{t('current app name')}</Heading>
          <p className='text-center'>
            <Trans
              {...{
                t,
                i18nKey: 'using halo as message',
                values: { displayName: profile.displayName ?? humanize(profile.identityKey.toHex()) },
                components: { nameStyle: <span className='text-success-600 dark:text-success-300'>_</span> }
              }}
            />
          </p>
        </div>
      ) : (
        <div role='none' className='flex flex-col gap-2 items-center'>
          <img
            className={mx(getSize(32), 'block dark:hidden mli-auto')}
            alt={t('halo logo alt')}
            src={lightThemeLogo}
          />
          <img className={mx(getSize(32), 'hidden dark:block mli-auto')} alt={t('halo logo alt')} src={darkThemeLogo} />
          <Heading className='text-center'>{t('current app name')}</Heading>
          <p className='text-center'>{t('identities empty message')}</p>
          <AuthChoices
            {...{
              onJoin: () => navigate(`/identity/join?redirect=${redirect}`),
              onCreate: () => navigate(`/identity/create?redirect=${redirect}`),
              onRecover: () => navigate(`/identity/recover?redirect=${redirect}`)
            }}
          />
        </div>
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
