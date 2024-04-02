//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { type PropsWithChildren } from 'react';

import { modalSurface, groupSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { Button, ButtonGroup, type ButtonProps } from './Button';
import { withTheme } from '../../testing';
import { DensityProvider } from '../DensityProvider';
import { ElevationProvider } from '../ElevationProvider';

export default {
  title: 'react-ui/Button',
  component: Button,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

const Container = ({ children }: PropsWithChildren<{}>) => (
  <>
    <div role='group' className={mx('flex flex-col gap-4 mbe-4 p-4')}>
      <ElevationProvider elevation='base'>
        <div className='flex gap-4'>{children}</div>
        <DensityProvider density='fine'>
          <div className='flex gap-4'>{children}</div>
        </DensityProvider>
      </ElevationProvider>
    </div>
    <div
      role='group'
      className={mx('flex flex-col gap-4 mbe-4 p-4 rounded-lg', groupSurface, surfaceElevation({ elevation: 'group' }))}
    >
      <ElevationProvider elevation='group'>
        <div className='flex gap-4'>{children}</div>
        <DensityProvider density='fine'>
          <div className='flex gap-4'>{children}</div>
        </DensityProvider>
      </ElevationProvider>
    </div>
    <div
      role='group'
      className={mx(
        'flex flex-col gap-4 mbe-4 p-4 rounded-lg',
        modalSurface,
        surfaceElevation({ elevation: 'chrome' }),
      )}
    >
      <ElevationProvider elevation='chrome'>
        <div className='flex gap-4'>{children}</div>
        <DensityProvider density='fine'>
          <div className='flex gap-4'>{children}</div>
        </DensityProvider>
      </ElevationProvider>
    </div>
  </>
);

export const Default = {
  render: ({ children, ...args }: Omit<ButtonProps, 'ref'>) => (
    <Container>
      <Button {...args}>{children}</Button>
      <Button {...args} disabled>
        Disabled
      </Button>
      {(args.variant === 'default' || args.variant === 'primary') && (
        <ButtonGroup>
          <Button {...args}>
            <CaretLeft />
          </Button>
          <Button {...args}>
            <CaretRight />
          </Button>
        </ButtonGroup>
      )}
    </Container>
  ),
  args: { children: 'Hello', disabled: false, variant: 'default' },
};

export const Primary = { ...Default, args: { variant: 'primary', children: 'Hello' } };

export const Destructive = { ...Default, args: { variant: 'destructive', children: 'Delete' } };

export const Outline = { ...Default, args: { variant: 'outline', children: 'Hello' } };

export const Ghost = { ...Default, args: { variant: 'ghost', children: 'Hello' } };
