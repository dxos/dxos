//
// Copyright 2023 DXOS.org
//

import '@fontsource/poiret-one';

import { CaretRight, Key, Planet, QrCode, Receipt } from '@phosphor-icons/react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { DXOSHorizontalType } from '@dxos/brand';
import { Button, Input, useTranslation, Dialog } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { type ActionMenuItem, BifurcatedAction, CompoundButton } from '@dxos/shell/react';

import { hero } from './hero-image';
import { WelcomeState, type WelcomeScreenProps, validEmail } from './types';
import { WELCOME_PLUGIN } from '../../meta';

const supportsPasskeys = navigator.credentials && 'create' in navigator.credentials;

export const Welcome = ({
  state,
  identity,
  error,
  onSignup,
  onPasskey,
  onJoinIdentity,
  onRecoverIdentity,
  onSpaceInvitation,
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
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === 'Enter') {
        void handleSignup();
      }
    },
    [handleSignup],
  );

  const handleEmailChange = useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
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
    <Dialog.Root defaultOpen>
      <Dialog.Overlay
        classNames='dark !bg-neutral-950 bg-no-repeat bg-center'
        style={{ backgroundImage: `url(${hero})` }}
      >
        <div
          className={mx(
            'relative grid grid-cols-1 md:w-[40rem] max-w-[40rem] h-full md:h-[675px] overflow-hidden',
            'rounded-xl shadow-lg lg:translate-x-[-40%]',
          )}
          style={{
            backgroundImage: 'radial-gradient(circle farthest-corner at 50% 50%, #2d6fff80, var(--dx-neutral-950))',
          }}
        >
          <div className='z-10 flex flex-col gap-8 p-8 md:px-16'>
            <h1 className="font-['Poiret One'] text-[80px]" style={{ fontFamily: 'Poiret One' }}>
              composer
            </h1>

            {state === WelcomeState.INIT && Object.keys(actions).length > 0 && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t('existing users title')}</h1>
                  <p className='text-subdued'>{t('existing users description')}</p>
                </div>
                <div className='flex flex-col gap-2'>
                  <BifurcatedAction actions={actions} />
                </div>
              </div>
            )}

            {state === WelcomeState.INIT && !onSpaceInvitation && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t(identity ? 'welcome back title' : 'welcome title')}</h1>
                  <p className='text-subdued'>{t(identity ? 'welcome back description' : 'welcome description')}</p>
                </div>
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

            {state === WelcomeState.INIT && onSpaceInvitation && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t('space invitation welcome title')}</h1>
                  <p className='text-subdued'>{t('space invitation welcome description')}</p>
                </div>
                <CompoundButton
                  slots={{ root: { className: 'is-full' } }}
                  after={<CaretRight className={getSize(4)} weight='bold' />}
                  before={<Planet className={getSize(6)} />}
                  onClick={onSpaceInvitation}
                >
                  {t('join space button label')}
                </CompoundButton>
              </div>
            )}

            {state === WelcomeState.EMAIL_SENT && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t('welcome title')}</h1>
                  <p className='text-subdued'>{t('check email for access')}</p>
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
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

export default Welcome;
