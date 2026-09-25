//
// Copyright 2026 DXOS.org
//

import '@fontsource/poiret-one';

import React from 'react';

import { DXOSHorizontalType } from '@dxos/brand';
import { Flex, Icon, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta.ts';

/**
 * Shown while a magic-link token is being redeemed and this device admitted to the existing
 * identity. Mirrors the Welcome card's chrome (border, gradient, logo, footer) so swapping between
 * the two dialogs reads as a continuation of the login gate rather than a different screen.
 */
export const AuthorizingDeviceDialog = () => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <div
      className={mx(
        'relative grid grid-cols-1 md:w-[37rem] max-w-[37rem] h-full md:h-[675px] overflow-hidden',
        'border-2 border-sky-950 rounded-xl lg:translate-x-[-40%]',
      )}
      style={{
        backgroundImage: 'radial-gradient(circle farthest-corner at 50% 50%, #2d6fff80, var(--color-neutral-950))',
      }}
    >
      <Flex column gap='2xl' classNames='z-10 p-8 md:px-16 h-full'>
        <span className='font-["Poiret One"] text-[80px]' style={{ fontFamily: 'Poiret One' }}>
          composer
        </span>

        <Flex column align='center' justify='center' gap='lg' classNames='flex-1'>
          <Icon icon='ph--spinner-gap--regular' size={10} classNames='animate-spin text-description' />
          <h1 className='text-2xl text-center'>{t('authorizing-device.title')}</h1>
        </Flex>

        <Flex column classNames='z-[11] mt-auto'>
          <a href='https://dxos.org' target='_blank' rel='noreferrer'>
            <Flex gap='xs' center classNames='text-sm pr-3 pb-1 opacity-70'>
              <span className='text-description'>Powered by</span>
              <DXOSHorizontalType className='fill-white w-[80px]' />
            </Flex>
          </a>
        </Flex>
      </Flex>
    </div>
  );
};

export default AuthorizingDeviceDialog;
