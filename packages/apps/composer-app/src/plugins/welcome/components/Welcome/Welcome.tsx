//
// Copyright 2023 DXOS.org
//

import '@fontsource/poiret-one';

import { CaretRight, Key, Planet, QrCode, Receipt, User } from '@phosphor-icons/react';
import React, { type ChangeEvent, type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';

import { DXOSHorizontalType } from '@dxos/brand';
import { Button, Input, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { type ActionMenuItem, BifurcatedAction, CompoundButton } from '@dxos/shell/react';

import { hero } from './hero-image';
import { WelcomeState, type WelcomeScreenProps, validEmail } from './types';
import { WELCOME_PLUGIN } from '../../meta';

const supportsPasskeys = navigator.credentials && 'create' in navigator.credentials;

export const OVERLAY_CLASSES = 'dark !bg-neutral-950 bg-no-repeat bg-center';
export const OVERLAY_STYLE = { backgroundImage: `url(${hero})` };

export const Welcome = ({
  state,
  error,
  identity,
  onSignup,
  onPasskey,
  onJoinIdentity,
  onRecoverIdentity,
  onSpaceInvitation,
  onGoToLogin,
}: WelcomeScreenProps) => {
  const { t } = useTranslation(WELCOME_PLUGIN);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);

  const handleSignup = useCallback(async () => {
    if (validEmail(email)) {
      setPending(true);
      try {
        await onSignup?.(email);
      } finally {
        setPending(false);
      }
    } else {
      emailRef.current?.focus();
    }
  }, [email, onSignup]);

  const handleEmailKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === 'Enter') {
        void handleSignup();
      }
    },
    [handleSignup],
  );

  const handleEmailChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setEmail(ev.target.value.trim());
  }, []);

  const actions: Record<string, ActionMenuItem> = useMemo(
    () => ({
      ...(supportsPasskeys &&
        onPasskey && {
          passkey: {
            label: t('redeem passkey button label'),
            description: t('redeem passkey button description'),
            icon: Key,
            onClick: onPasskey,
          },
        }),
      ...(onJoinIdentity && {
        deviceInvitation: {
          label: t('join device button label'),
          description: t('join device button description'),
          icon: QrCode,
          onClick: onJoinIdentity,
        },
      }),
      ...(onRecoverIdentity && {
        recoveryCode: {
          label: t('recover identity button label'),
          description: t('recover identity button description'),
          icon: Receipt,
          onClick: onRecoverIdentity,
        },
      }),
    }),
    [t, supportsPasskeys, onPasskey, onJoinIdentity, onRecoverIdentity],
  );

  return (
    <div
      className={mx(
        'relative grid grid-cols-1 md:w-[40rem] max-w-[40rem] h-full md:h-[675px] overflow-hidden',
        'rounded-xl shadow-md lg:translate-x-[-40%]',
      )}
      style={{
        backgroundImage: 'radial-gradient(circle farthest-corner at 50% 50%, #2d6fff80, var(--dx-neutral-950))',
      }}
    >
      <div className='z-10 flex flex-col gap-8 p-8 md:px-16'>
        <h1 className="font-['Poiret One'] text-[80px]" style={{ fontFamily: 'Poiret One' }}>
          composer
        </h1>

        {state === WelcomeState.INIT && (
          <div role='none' className='flex flex-col gap-8'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl'>{identity ? t('existing identity title') : t('login title')}</h1>
              {!identity && <p className='text-subdued'>{t('beta description')}</p>}
            </div>
            {Object.keys(actions).length > 0 && (
              <>
                <div className='flex flex-col gap-2'>
                  <BifurcatedAction actions={actions} classNames='bg-neutral-775' />
                </div>
                <div className='flex items-center w-full my-4'>
                  <div className='flex-grow h-px bg-subdued'></div>
                  <span className='px-4 text-sm text-subdued'>or</span>
                  <div className='flex-grow h-px bg-subdued'></div>
                </div>
              </>
            )}
            <div role='none' className='flex gap-2'>
              <Input.Root>
                <div className='flex flex-col w-full'>
                  <Input.TextInput
                    autoFocus
                    ref={emailRef}
                    classNames='!bg-black'
                    placeholder={t('email input placeholder')}
                    value={email}
                    onChange={handleEmailChange}
                    onKeyDown={handleEmailKeyDown}
                  />
                  <Input.DescriptionAndValidation>
                    <Input.Validation classNames='flex h-4 px-2 py-1 text-rose-550'>
                      {error && t('email error')}
                    </Input.Validation>
                  </Input.DescriptionAndValidation>
                </div>
              </Input.Root>
              <div>
                <Button
                  variant='primary'
                  classNames='disabled:bg-neutral-775'
                  disabled={!validEmail(email) || pending}
                  onClick={handleSignup}
                  data-testid='welcome.login'
                >
                  {t('signup button label')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {state === WelcomeState.SPACE_INVITATION && (
          <div role='none' className='flex flex-col gap-8'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl'>{t('space invitation title')}</h1>
              <p className='text-subdued'>{t('space invitation description')}</p>
            </div>
            <CompoundButton
              slots={{ root: { className: 'is-full' } }}
              after={<CaretRight className={getSize(4)} weight='bold' />}
              before={<Planet className={getSize(6)} />}
              onClick={onSpaceInvitation}
            >
              {t('join space button label')}
            </CompoundButton>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl'>{t('go to login title')}</h1>
              <p className='text-subdued'>{t('go to login description')}</p>
            </div>
            <CompoundButton
              slots={{ root: { className: 'is-full' } }}
              after={<CaretRight className={getSize(4)} weight='bold' />}
              before={<User className={getSize(6)} />}
              onClick={onGoToLogin}
            >
              {t('go to login button label')}
            </CompoundButton>
          </div>
        )}

        {(state === WelcomeState.EMAIL_SENT || state === WelcomeState.LOGIN_SENT) && (
          <div role='none' className='flex flex-col gap-8'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl'>{t('check email title')}</h1>
              <p className='text-subdued'>
                {state === WelcomeState.EMAIL_SENT
                  ? t('request access email description')
                  : t('check email description')}
              </p>
            </div>
          </div>
        )}

        <div className='z-[11] flex flex-col h-full justify-end'>
          <a href='https://dxos.org' target='_blank' rel='noreferrer'>
            <div className='flex justify-center items-center text-sm gap-1 pr-3 pb-1 opacity-70'>
              <span className='text-subdued'>Powered by</span>
              <DXOSHorizontalType className='fill-white w-[80px]' />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
