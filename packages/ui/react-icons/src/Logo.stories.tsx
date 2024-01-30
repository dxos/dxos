//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { type Icon } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Button } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Composer, DXOS } from './icons';
// https://pixabay.com/sound-effects/search/logo/?pagi=2
// @ts-ignore
import ident from '../assets/sounds/ident-1.mp3';

const Icon = () => null;

export default {
  title: 'react-icons/Logo',
  component: Icon,
  decorators: [withTheme],
};

export const Default = {
  render: () => {
    const [spin, setSpin] = useState(false);
    const [logo, setLogo] = useState(false);
    const handleSpin = async () => {
      const audio = new Audio(ident);
      await audio.play();
      setTimeout(() => {
        setLogo(true);
      }, 1_500);
      setTimeout(() => {
        setSpin(true);
        setTimeout(() => {
          setSpin(false);
        }, 2_000);
      }, 50);
    };

    // 256,164,104
    // 256,168,112

    return (
      <div className='absolute flex w-full h-full items-center justify-center bg-neutral-100 inset-0'>
        <div className='absolute left-4 top-4'>
          <Button onClick={handleSpin}>Spin</Button>
        </div>
        <div className='absolute'>
          <Composer className={mx(spin && 'animate-spin-logo-1', 'w-[256px] h-[256px] [&>path]:fill-teal-300')} />
        </div>
        <div className='absolute'>
          <Composer
            className={mx(spin && 'animate-spin-logo-2', 'w-[168px] h-[168px] [&>path]:fill-teal-400')}
            style={{
              animationDirection: 'reverse',
            }}
          />
        </div>
        <div className='absolute'>
          <Composer className={mx(spin && 'animate-spin-logo-3', 'w-[112px] h-[112px] [&>path]:fill-teal-500')} />
        </div>

        <div
          className={mx('mt-[400px]', 'transition transition-opacity opacity-0 duration-1000', logo && 'opacity-100')}
        >
          <div className={mx('text-[100px] text-teal-400 font-[k2d] italic')}>composer</div>
          <div className={mx('flex items-center -mt-[20px] text-neutral-700')}>
            <span className='ml-[210px] mt-[2px] mr-2'>Powered by DXOS</span>
            <div>
              <DXOS className='w-[32px] h-[32px]' />
            </div>
          </div>
        </div>
      </div>
    );
  },
};
