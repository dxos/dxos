//
// Copyright 2023 DXOS.org
//

import '@fontsource/poiret-one';

import { CaretRight, Key, Planet, QrCode } from '@phosphor-icons/react';
import React, { useCallback, useRef, useState } from 'react';

import { DXOSHorizontalType } from '@dxos/brand';
import { Button, Input, useTranslation, Dialog } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { CompoundButton } from '@dxos/shell/react';

import { hero } from './hero-image';
import { WelcomeState, type WelcomeScreenProps, validEmail } from './types';
import { WELCOME_PLUGIN } from '../../meta';

export const Welcome = ({
  state,
  identity,
  error,
  onSignup,
  onJoinIdentity,
  onRecoverIdentity,
  onSpaceInvitation,
}: WelcomeScreenProps) => {
  const { t } = useTranslation(WELCOME_PLUGIN);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');

  const handleSignup = useCallback(() => {
    if (validEmail(email)) {
      onSignup?.(email);
    } else {
      emailRef.current?.focus();
    }
  }, [email]);

  return (
    <Dialog.Root defaultOpen>
      <Dialog.Overlay
        classNames='dark !bg-neutral-950 bg-no-repeat bg-center'
        style={{ backgroundImage: `url(${hero})` }}
      >
        <div
          className={mx(
            'relative grid grid-cols-1 md:w-[600px] max-w-[600px] h-full md:h-[675px] overflow-hidden',
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
                        onChange={(ev) => setEmail(ev.target.value.trim())}
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
                      disabled={!validEmail(email)}
                      onClick={handleSignup}
                      data-testid='welcome.login'
                    >
                      {t('login button label')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {state === WelcomeState.INIT && onSpaceInvitation && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t(identity ? 'welcome back title' : 'welcome title')}</h1>
                  <p className='text-subdued'>{t(identity ? 'welcome back description' : 'welcome description')}</p>
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

            {state === WelcomeState.INIT && (onJoinIdentity || onRecoverIdentity) && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t('new device')}</h1>
                  <p className='text-subdued'>{t('new device description')}</p>
                </div>
                <div className='flex flex-col gap-2'>
                  {onJoinIdentity && (
                    <CompoundButton
                      slots={{ label: { className: 'text-sm' } }}
                      after={<CaretRight className={getSize(4)} weight='bold' />}
                      before={<QrCode className={getSize(6)} />}
                      onClick={onJoinIdentity}
                      data-testid='welcome.join-identity'
                    >
                      {t('join device button label')}
                    </CompoundButton>
                  )}
                  {onRecoverIdentity && (
                    <CompoundButton
                      slots={{ label: { className: 'text-sm' } }}
                      after={<CaretRight className={getSize(4)} weight='bold' />}
                      before={<Key className={getSize(6)} />}
                      onClick={onRecoverIdentity}
                      data-testid='welcome.recover-identity'
                    >
                      {t('recover identity button label')}
                    </CompoundButton>
                  )}
                </div>
              </div>
            )}

            {state === WelcomeState.EMAIL_SENT && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t('welcome title')}</h1>
                  <p className='text-subdued'>{identity ? t('check email for access') : t('check email to confirm')}</p>
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
