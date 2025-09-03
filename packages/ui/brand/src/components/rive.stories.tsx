//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Rive, useRive } from '@rive-app/react-canvas';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect } from 'react';

import { useAsyncState } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

const useFlash = (rive: Rive | null, name: string, delay: number, period: number) => {
  useEffect(() => {
    let t: any;
    if (rive) {
      t = setTimeout(() => {
        t = setInterval(() => {
          rive?.play(name);
        }, period);
      }, delay);
    }

    return () => clearTimeout(t);
  }, [rive]);
};

const Component = ({ buffer }: { buffer: ArrayBuffer }) => {
  // https://rive.app/community/doc/rive-parameters/docHI9ASztXP
  const { rive, RiveComponent } = useRive({ buffer, autoplay: false });
  useFlash(rive, 'flash-1', 500, 3_000);
  useFlash(rive, 'flash-2', 2_000, 2_000);

  return (
    <div className='m-8 relative flex grow justify-center'>
      <RiveComponent />
      <div className='z-1 absolute inset-0' style={{ background: 'radial-gradient(transparent, black)' }} />
    </div>
  );
};

const DefaultStory = () => {
  const [buffer] = useAsyncState<ArrayBuffer>(async () => {
    // CORS set via dashboard.
    const response = await fetch('https://dxos.network/dxos.riv', { mode: 'cors' });
    if (response.ok) {
      return await response.arrayBuffer();
    } else {
      console.log(response.status);
    }
  });

  if (!buffer) {
    return null;
  }

  return (
    <>
      <Component buffer={buffer} />
      <div className='flex absolute left-0 right-0 top-[120px] h-[320px] align-center'>
        <div
          className='z-1 absolute inset-0 w-[800px] m-auto'
          style={{
            background: 'radial-gradient(ellipse 200% 100% at center, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0) 50%)',
          }}
        />
        <div
          className={mx(
            'z-2 absolute inset-0 flex items-center w-[720px] m-auto p-2',
            'text-white text-[60px] leading-tight text-center font-thin _border _border-red-500',
          )}
        >
          The new standard for building collaborative local-first software.
        </div>
      </div>
    </>
  );
};

const meta = {
  title: 'ui/brand/Rive',
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withLayout({
      fullscreen: true,
      classNames: ['absolute inset-0 bg-black'],
    }),
  ],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
