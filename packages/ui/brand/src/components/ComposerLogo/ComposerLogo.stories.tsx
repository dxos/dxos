//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import '@fontsource/k2d/100-italic.css';

import { Ghost, Square } from '@phosphor-icons/react';
import React, { useRef, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { type AnimationController, ComposerLogo, ComposerSpinner } from './ComposerLogo';
import { DXOS } from '../../icons';

// import ident from '../../../assets/sounds/ident-1.mp3';

// https://pixabay.com/sound-effects/search/logo/?pagi=2

export default {
  title: 'brand/Logo',
  component: ComposerLogo,
  decorators: [withTheme],
};

// TODO(burdon): Get from theme?
export const colors = {
  gray: '#888888',
  purple: '#AA23D3',
  orange: '#CA6346',
  green: '#4DA676',
  blue: '#539ACD',
};

const pickOne = <T,>(obj: Record<string, T>) => Object.values(obj)[Math.floor(Math.random() * Object.keys(obj).length)];

export const Default = {
  render: () => {
    const controller = useRef<AnimationController>(null);
    const [logo, setLogo] = useState(false);
    const handleSpin = async () => {
      // const audio = new Audio(ident);
      // await audio.play();
      setTimeout(() => {
        setLogo(true);
      }, 1_500);

      controller.current?.spin();
    };

    return (
      <div className='absolute flex w-full h-full items-center justify-center bg-neutral-100 inset-0'>
        <div className='absolute left-4 top-4'>
          <Button onClick={handleSpin}>Spin</Button>
        </div>

        <div>
          <div className='flex justify-center'>
            <ComposerLogo ref={controller} size={256} />
          </div>

          <div className={mx('transition opacity-0 duration-1000', logo && 'opacity-100')}>
            <div className={mx('text-[100px] text-teal-400 font-[k2d] italic')}>composer</div>
            <div className={mx('flex items-center -mt-[20px] text-neutral-700')}>
              <span className='ml-[210px] mt-[2px] mr-2'>Powered by DXOS</span>
              <div>
                <DXOS className='w-[32px] h-[32px]' />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export const Colors = {
  render: () => {
    const colors = [
      ['fill-teal-400', 'fill-teal-500', 'fill-teal-600'],
      ['fill-orange-400', 'fill-orange-500', 'fill-orange-600'],
      ['fill-cyan-400', 'fill-cyan-500', 'fill-cyan-600'],
      ['fill-purple-400', 'fill-purple-500', 'fill-purple-600'],
      ['fill-stone-400', 'fill-stone-500', 'fill-stone-600'],
      ['fill-neutral-200', 'fill-neutral-400', 'fill-neutral-600'],
      ['fill-blue-500', 'fill-while', 'fill-red-500'],
      ['fill-green-500', 'fill-yellow-200', 'fill-red-500'],
    ];

    return (
      <div className='grid grid-cols-4 gap-8 p-16'>
        {colors.map((classNames, i) => (
          <div key={i} className='flex justify-center my-8'>
            <ComposerLogo size={256} classNames={classNames} />
          </div>
        ))}
      </div>
    );
  },
};

export const Pacman = {
  render: () => {
    return (
      <div className='absolute inset-0 flex flex-col justify-center'>
        <div className='flex flex-col'>
          <div className='flex items-center p-8'>
            <div className='flex ml-8 mr-[100px]'>
              <div>
                <Ghost className='w-[220px] h-[220px] text-blue-500' />
              </div>
              <div>
                <Ghost className='w-[220px] h-[220px] text-purple-500' />
              </div>
              <div>
                <Ghost className='w-[220px] h-[220px] text-red-500' />
              </div>
            </div>

            <div>
              <ComposerLogo size={200} classNames={['fill-yellow-100', 'fill-yellow-200', 'fill-yellow-300']} />
            </div>

            <div className='flex -ml-10'>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className='p-4'>
                  <Square weight='duotone' className='w-6 h-6 text-yellow-200' />
                </div>
              ))}
            </div>
          </div>

          <div className='flex justify-center font-mono font-light text-[60px] mt-8 text-neutral-200'>
            <div>Ready Player 1</div>
          </div>
        </div>
      </div>
    );
  },
};

const SpinnerContainer = () => {
  const [spinning, setSpinning] = useState(false);
  return (
    <div>
      <div className='absolute left-4 top-4'>
        {(spinning && <Button onClick={() => setSpinning(false)}>Stop</Button>) || (
          <Button onClick={() => setSpinning(true)}>Start</Button>
        )}
      </div>
      <div className='grid grid-cols-3 gap-20'>
        <>
          <div className='flex justify-center items-center'>
            <ComposerSpinner spinning={spinning} gap={1} size={200} color={colors.blue} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner spinning={spinning} gap={1} size={200} color={colors.green} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner spinning={spinning} gap={1} size={200} color={colors.orange} />
          </div>
        </>
        <>
          <div className='flex justify-center items-center'>
            <ComposerSpinner spinning={spinning} gap={1} size={200} color={colors.blue} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner spinning={spinning} gap={1} size={100} color={colors.green} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner spinning={spinning} gap={1} size={40} color={colors.orange} />
          </div>
        </>
      </div>
    </div>
  );
};

export const Spinner = {
  render: () => {
    return (
      <div className='absolute inset-0 flex items-center justify-center'>
        <SpinnerContainer />
      </div>
    );
  },
};
