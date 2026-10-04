//
// Copyright 2026 DXOS.org
//

import '@fontsource/poiret-one';

import React from 'react';

import { DXOSHorizontalType } from '@dxos/brand';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta.ts';

/**
 * Shown while a magic-link token is being redeemed and this device admitted to the existing
 * identity. Mirrors the Welcome card's chrome (border, gradient, logo, footer) so swapping between
 * the two dialogs reads as a continuation of the login gate rather than a different screen.
 */
export const AuthorizingDeviceDialog = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);

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
      <Flex.Flex column gap='2xl' classNames='z-10 p-8 md:px-16 h-full'>
        <span className='font-["Poiret One"] text-[80px] leading-[1.5]' style={{ fontFamily: 'Poiret One' }}>
          composer
        </span>

        <Flex.Flex column align='center' justify='center' gap='lg' classNames='flex-1'>
          <Icon.Icon icon='ph--spinner-gap--regular' size='xl' spin tone='muted' />
          <h1 className='text-2xl text-center'>{t('authorizing-device.title')}</h1>
        </Flex.Flex>

        <Flex.Flex column classNames='z-[11] mt-auto'>
          <a href='https://dxos.org' target='_blank' rel='noreferrer'>
            <Flex.Flex gap='xs' center classNames='text-sm pr-3 pb-1 opacity-70'>
              <span className='text-fg-muted'>Powered by</span>
              <DXOSHorizontalType className='fill-white w-[80px]' />
            </Flex.Flex>
          </a>
        </Flex.Flex>
      </Flex.Flex>
    </div>
  );
};

export default AuthorizingDeviceDialog;
