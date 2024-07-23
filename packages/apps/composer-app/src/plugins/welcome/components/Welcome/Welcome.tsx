//
// Copyright 2023 DXOS.org
//

import '@fontsource/poiret-one';

import { CaretRight, Planet, QrCode } from '@phosphor-icons/react';
import Spline from '@splinetool/react-spline';
import { type Application } from '@splinetool/runtime';
import React, { useRef, useState } from 'react';

import { DXOSHorizontalType } from '@dxos/brand';
import { Button, Input, useTranslation, Dialog, useThemeContext } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { CompoundButton } from '@dxos/shell/react';

import { Aurora, auroraStyle } from './Aurora';
// @ts-ignore
import splineUrl from './composer_splash.spline?url';
import { WelcomeState, type WelcomeScreenProps, validEmail } from './types';
import { WELCOME_PLUGIN } from '../../meta';

/**
 * Spline file downloaded from editor.
 * Animation loop (ping-pong).
 * https://docs.spline.design/6bc2cb50565041e0a082a5f271594175
 * https://app.spline.design/file/e6fef85a-c3c0-490c-8426-6508294beb7a
 */
export const Welcome = ({
  state,
  identity,
  error,
  onSignup,
  onJoinIdentity,
  onSpaceInvitation,
}: WelcomeScreenProps) => {
  const { t } = useTranslation(WELCOME_PLUGIN);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [spline, setSpline] = useState<Application>();

  const handleSignup = () => {
    if (validEmail(email)) {
      onSignup?.(email);
    } else {
      emailRef.current?.focus();
    }
  };

  // https://github.com/splinetool/react-spline?tab=readme-ov-file#spline-app-methods
  const handleLoadEvent = (spline: Application) => {
    setSpline(spline);
  };

  return (
    <Dialog.Root defaultOpen>
      <Dialog.Overlay classNames='!bg-neutral-950'>
        <div
          className={mx(
            'relative grid grid-cols-1 md:grid-cols-2 md:w-[900px] max-w-[900px] h-full md:h-[620px] overflow-hidden',
            'rounded-xl shadow-lg',
          )}
        >
          {/* Background */}
          <div className='absolute inset-0 bg-[#1D3C6655]'>
            {/* https://github.com/splinetool/react-spline?tab=readme-ov-file#spline-component-props */}
            <Spline
              className={mx(spline ? 'transition duration-1000 opacity-75' : 'opacity-0')}
              scene={splineUrl}
              onLoad={handleLoadEvent}
            />
          </div>

          <div className='z-10 flex flex-col gap-8 p-8 bg-black bg-opacity-70'>
            <h1 className="font-['Poiret One'] text-[80px]" style={{ fontFamily: 'Poiret One' }}>
              composer
            </h1>

            {state === WelcomeState.INIT && !onSpaceInvitation && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t(identity ? 'welcome back title' : 'welcome title')}</h1>
                  <p className='fg-subdued'>{t(identity ? 'welcome back description' : 'welcome description')}</p>
                </div>
                <div role='none' className='flex items-center gap-4'>
                  <Input.Root>
                    <Input.TextInput
                      autoFocus
                      ref={emailRef}
                      classNames='!bg-black'
                      placeholder={t('email input placeholder')}
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value.trim())}
                    />
                    <Input.DescriptionAndValidation>
                      <Input.Validation>{error && t('email error')}</Input.Validation>
                    </Input.DescriptionAndValidation>
                  </Input.Root>
                  <Button disabled={!validEmail(email)} onClick={() => handleSignup()} data-testid='welcome.login'>
                    {t('login button label')}
                  </Button>
                </div>
              </div>
            )}

            {state === WelcomeState.INIT && onSpaceInvitation && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t(identity ? 'welcome back title' : 'welcome title')}</h1>
                  <p className='fg-subdued'>{t(identity ? 'welcome back description' : 'welcome description')}</p>
                </div>
                <CompoundButton
                  slots={{ root: { className: 'is-full' } }}
                  after={<CaretRight className={getSize(4)} weight='bold' />}
                  before={<Planet className={getSize(6)} />}
                  onClick={() => onSpaceInvitation()}
                >
                  {t('join space button label')}
                </CompoundButton>
              </div>
            )}

            {state === WelcomeState.INIT && onJoinIdentity && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t('new device')}</h1>
                  <p className='fg-subdued'>{t('new device description')}</p>
                </div>
                <CompoundButton
                  slots={{ label: { className: 'text-sm' } }}
                  after={<CaretRight className={getSize(4)} weight='bold' />}
                  before={<QrCode className={getSize(6)} />}
                  onClick={() => onJoinIdentity()}
                  data-testid='welcome.join-identity'
                >
                  {t('join device button label')}
                </CompoundButton>
              </div>
            )}

            {state === WelcomeState.EMAIL_SENT && (
              <div role='none' className='flex flex-col gap-8'>
                <div className='flex flex-col gap-2'>
                  <h1 className='text-2xl'>{t('welcome title')}</h1>
                  <p className='fg-subdued'>{t('check email')}</p>
                </div>
              </div>
            )}
          </div>

          <div className='z-20 hidden md:flex flex-col h-full justify-end'>
            <a href='https://dxos.org' target='_blank' rel='noreferrer'>
              <div className='flex justify-end items-center text-sm gap-1 pr-3 pb-1 opacity-70'>
                <span className='fg-subdued'>Powered by</span>
                <DXOSHorizontalType className='fill-white w-[80px]' />
              </div>
            </a>
          </div>
        </div>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const _Alternate = ({ identity, onSignup, onJoinIdentity, onSpaceInvitation }: WelcomeScreenProps) => {
  const { t } = useTranslation(WELCOME_PLUGIN);
  const { tx } = useThemeContext();
  const [email, setEmail] = useState('');

  const handleSignup = () => {
    // TODO(burdon): validate email.
    onSignup?.(email);
  };

  return (
    <>
      <div role='none' className='fixed inset-0 z-0'>
        <style>{auroraStyle}</style>
        <Aurora />
      </div>
      <div role='none' className={tx('dialog.overlay', 'dialog__overlay', {}, '!bg-transparent')}>
        <div role='main' className='is-[95vw] max-is-[30rem] rounded-lg border separator-separator overflow-hidden'>
          <header className='pli-6 plb-10 rounded-bs-lg bg-neutral-12/50 dark:bg-neutral-850/50 backdrop-blur'>
            <h1 className='block text-9xl'>Composer</h1>
          </header>
          <div role='none' className='p-6 surface-base'>
            {onSpaceInvitation ? (
              <>
                <h1 className='text-2xl mbs-1 mbe-2'>{t('space invitation title')}</h1>
                <p className='fg-subdued'>{t('space invitation description')}</p>
                <CompoundButton
                  slots={{ root: { className: 'is-full mbs-2' } }}
                  after={<CaretRight className={getSize(4)} weight='bold' />}
                  before={<Planet className={getSize(6)} />}
                  onClick={() => onSpaceInvitation()}
                >
                  {t('join space button label')}
                </CompoundButton>
              </>
            ) : (
              <>
                <h1 className='text-2xl mbs-1 mbe-2'>{t(identity ? 'welcome back title' : 'welcome title')}</h1>
                <p className='fg-subdued'>{t(identity ? 'welcome back description' : 'welcome description')}</p>
                <div role='none' className='flex items-center gap-2 mbs-2 mbe-5'>
                  <Input.Root>
                    <Input.TextInput
                      placeholder={t('email input placeholder')}
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                    />
                  </Input.Root>
                  <Button onClick={() => handleSignup()} data-testid='welcome.login'>
                    {t('login button label')}
                  </Button>
                </div>
              </>
            )}

            {onJoinIdentity && (
              <>
                <h1 className='text-2xl mbs-5 mbe-2'>{t('new device')}</h1>
                <p className='fg-subdued'>{t('new device description')}</p>
                <CompoundButton
                  slots={{ root: { className: 'is-full mbs-2' } }}
                  after={<CaretRight className={getSize(4)} weight='bold' />}
                  before={<QrCode className={getSize(6)} />}
                  onClick={() => onJoinIdentity()}
                  data-testid='welcome.join-identity'
                >
                  {t('join device button label')}
                </CompoundButton>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
