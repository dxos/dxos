//
// Copyright 2022 DXOS.org
//

import '@fontsource/k2d/100-italic.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';

import { Button, Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/react-ui-theme';

import { DXOS } from '../../icons';

import { type AnimationController, ComposerLogo, ComposerSpinner } from './ComposerLogo';

// import ident from '../../../assets/sounds/ident-1.mp3';

// https://pixabay.com/sound-effects/search/logo/?pagi=2

const meta = {
  title: 'ui/brand/Logo',
  component: ComposerLogo,
  decorators: [withTheme],
} satisfies Meta<typeof ComposerLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

// TODO(burdon): Get from theme?
const colors = {
  gray: '#888888',
  purple: '#AA23D3',
  orange: '#CA6346',
  green: '#4DA676',
  blue: '#539ACD',
};

export const Default: Story = {
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
      <div className='absolute flex inset-0 items-center justify-center'>
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
                <DXOS className='is-[32px] bs-[32px]' />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

// TODO(burdon): Camo.
export const Colors: Story = {
  render: () => {
    const colors = [
      ['fill-teal-400', 'fill-teal-500', 'fill-teal-600'],
      ['fill-orange-400', 'fill-orange-500', 'fill-orange-600'],
      ['fill-cyan-400', 'fill-cyan-500', 'fill-cyan-600'],
      ['fill-purple-400', 'fill-purple-500', 'fill-purple-600'],
      ['fill-blue-500', 'fill-blue-600', 'fill-blue-700'],
      ['fill-slate-500', 'fill-slate-600', 'fill-slate-700'],
      ['fill-blue-500', 'fill-neutral-100', 'fill-red-500'],
      ['fill-stone-400', 'fill-stone-500', 'fill-stone-600'],
      ['fill-neutral-500', 'fill-neutral-600', 'fill-neutral-700'],
    ];

    return (
      <div className='absolute inset-0 flex justify-center items-center'>
        <div className='grid grid-cols-3 gap-20 is-[800px]'>
          {colors.map((classNames, i) => (
            <div key={i} className='flex justify-center items-center'>
              <ComposerLogo animate={false} size={160} classNames={classNames} />
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const Pacman: Story = {
  render: () => {
    return (
      <div className='absolute inset-0 flex flex-col justify-center'>
        <div className='flex flex-col'>
          <div className='flex items-center p-4'>
            <div className='flex ml-8 mr-[100px]'>
              <div>
                <Icon icon='ph--ghost--duotone' classNames='is-[180px] bs-[180px] text-blue-500' />
              </div>
              <div>
                <Icon icon='ph--ghost--duotone' classNames='is-[180px] bs-[180px] text-purple-500' />
              </div>
              <div>
                <Icon icon='ph--ghost--duotone' classNames='is-[180px] bs-[180px] text-red-500' />
              </div>
            </div>

            <ComposerLogo size={145} classNames={['fill-yellow-200', 'fill-yellow-300', 'fill-yellow-400']} />

            <div className='flex -ml-10'>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className='p-4'>
                  <Icon icon='ph--square--duotone' classNames='is-6 bs-6 text-yellow-200' />
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
            <ComposerSpinner animate={spinning} gap={1} size={200} color={colors.blue} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={200} color={colors.green} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={200} color={colors.orange} />
          </div>
        </>
        <>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={200} color={colors.blue} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={100} color={colors.green} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={40} color={colors.orange} />
          </div>
        </>
      </div>
    </div>
  );
};

export const Spinner: Story = {
  render: () => {
    return (
      <div className='absolute inset-0 flex items-center justify-center'>
        <SpinnerContainer />
      </div>
    );
  },
};

// https://github.com/grafana/grafana/blob/main/packages/grafana-ui/src/components/LoadingBar/LoadingBar.tsx
export const Linear: Story = {
  render: () => {
    return (
      <div className='absolute flex flex-col inset-0 bg-black'>
        <div
          className={'h-[1px] translateX(-100%) animate-progress-linear'}
          style={{
            background:
              'linear-gradient(90deg, rgba(110, 159, 255, 0) 0%, #6E9FFF 80.75%, rgba(110, 159, 255, 0) 100%)',
          }}
        />
      </div>
    );
  },
};
