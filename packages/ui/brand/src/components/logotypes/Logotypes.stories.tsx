//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, type PropsWithChildren } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import dxosBlack from '../../../assets/logotypes/dxos-horizontal-block.svg?raw';
import dxosWhite from '../../../assets/logotypes/dxos-horizontal-white.svg?raw';
import echoBlack from '../../../assets/logotypes/echo-horizontal-black.svg?raw';
import echoWhite from '../../../assets/logotypes/echo-horizontal-white.svg?raw';
import haloBlack from '../../../assets/logotypes/halo-horizontal-black.svg?raw';
import haloWhite from '../../../assets/logotypes/halo-horizontal-white.svg?raw';
import meshBlack from '../../../assets/logotypes/mesh-horizontal-black.svg?raw';
import meshWhite from '../../../assets/logotypes/mesh-horizontal-white.svg?raw';
import plexBlack from '../../../assets/logotypes/plex-horizontal-black.svg?raw';
import plexWhite from '../../../assets/logotypes/plex-horizontal-white.svg?raw';
import { DXOSHorizontalType } from './DXOSHorizontalType.tsx';
import { DXOSType } from './DXOSType.tsx';
import { DXOSVerticalType } from './DXOSVerticalType.tsx';

const Icon = () => null;

const meta = {
  title: 'ui/brand/components/LogoTypes',
  component: Icon,
  decorators: [withTheme()],
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

const Cell = ({ children, dark }: PropsWithChildren<{ dark?: boolean }>) => (
  <div className={mx('flex p-4 justify-center rounded-md', dark ? 'bg-zinc-800 fill-zinc-50' : 'bg-zinc-100')}>
    {children}
  </div>
);

export const Default: Story = {
  render: () => {
    return (
      <div className='absolute flex dx-fill items-center justify-center'>
        <div className='flex grid grid-cols-2 gap-16'>
          <Cell>
            <DXOSType className='w-[256px]' />
          </Cell>
          <Cell dark>
            <DXOSType className='w-[128px]' />
          </Cell>

          <Cell>
            <DXOSHorizontalType className='w-[256px]' />
          </Cell>
          <Cell dark>
            <DXOSHorizontalType className='w-[128px]' />
          </Cell>

          <Cell>
            <DXOSVerticalType className='w-[256px]' />
          </Cell>
          <Cell dark>
            <DXOSVerticalType className='w-[128px]' />
          </Cell>
        </div>
      </div>
    );
  },
};

const horizontal: Record<string, { black: string; white: string }> = {
  dxos: { black: dxosBlack, white: dxosWhite },
  echo: { black: echoBlack, white: echoWhite },
  halo: { black: haloBlack, white: haloWhite },
  mesh: { black: meshBlack, white: meshWhite },
  plex: { black: plexBlack, white: plexWhite },
};

const Svg = ({ svg }: { svg: string }) => (
  <div className='w-[320px] [&>svg]:w-full [&>svg]:h-auto' dangerouslySetInnerHTML={{ __html: svg }} />
);

/** The horizontal logotype of every product, from `assets/logotypes/`; the n-th letters line up across rows. */
export const Products: Story = {
  render: () => {
    return (
      <div className='absolute flex dx-fill items-center justify-center'>
        <div className='grid grid-cols-2 gap-4'>
          {Object.entries(horizontal).map(([name, { black, white }]) => (
            <Fragment key={name}>
              <Cell>
                <Svg svg={black} />
              </Cell>
              <Cell dark>
                <Svg svg={white} />
              </Cell>
            </Fragment>
          ))}
        </div>
      </div>
    );
  },
};
