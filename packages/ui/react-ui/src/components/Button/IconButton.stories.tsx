//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type Density } from '@dxos/ui-types';

import { withTheme } from '../../testing';
import { Tooltip } from '../Tooltip';
import { Button } from './Button';
import { IconButton, type IconButtonProps } from './IconButton';

const DefaultStory = (props: IconButtonProps) => {
  return (
    <Tooltip.Provider>
      <div className='flex gap-4'>
        <IconButton {...props} />
        <IconButton iconOnly {...props} />
        <Button>{props.label}</Button>
      </div>
    </Tooltip.Provider>
  );
};

const densities: Density[] = ['lg', 'md', 'sm', 'xs'];
const densityIconSize: Record<Density, IconButtonProps['size']> = {
  lg: 5,
  md: 4,
  sm: 4,
  xs: 4,
};

const DensitiesStory = (props: Omit<IconButtonProps, 'density' | 'size'>) => {
  return (
    <Tooltip.Provider>
      <div className='grid grid-cols-[auto_1fr_1fr_1fr] gap-4 items-center'>
        <div />
        <div className='text-xs text-subdued uppercase'>iconOnly</div>
        <div className='text-xs text-subdued uppercase'>label + icon</div>
        <div className='text-xs text-subdued uppercase'>Button (reference)</div>
        {densities.map((density) => (
          <React.Fragment key={density}>
            <div className='text-xs font-mono'>density={density}</div>
            <IconButton
              square
              classNames='w-fit'
              density={density}
              size={densityIconSize[density]}
              iconOnly
              {...props}
            />
            <IconButton classNames='w-fit' density={density} size={densityIconSize[density]} {...props} />
            <Button density={density}>{props.label}</Button>
          </React.Fragment>
        ))}
      </div>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/IconButton',
  component: IconButton,
  render: DefaultStory as any,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DensitiesStory as any,
  args: {
    label: 'Close',
    icon: 'ph--x--regular',
  },
};

export const Ghost: Story = {
  render: DensitiesStory as any,
  args: {
    label: 'Close',
    icon: 'ph--x--regular',
    variant: 'ghost',
  },
};
