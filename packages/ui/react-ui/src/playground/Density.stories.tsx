//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IconButton } from '../components/Button';
import { Input } from '../components/Input';
import { withLayoutVariants, withTheme } from '../testing';

/**
 * The three control sizes side by side, across control types — a density change must read the same
 * on a checkbox, a text field and an icon button, since they share the `--dx-control*` knobs.
 */
const DensityStory = () => (
  <div className='flex flex-col gap-4'>
    {(['lg', 'md', 'sm'] as const).map((density) => (
      <Input.Root key={density}>
        <Input.Label>{`density="${density}"`}</Input.Label>
        <div className='flex items-center gap-2'>
          <Input.Checkbox size={density === 'lg' ? 5 : 4} />
          <Input.TextInput density={density} classNames='grow' placeholder={`This is a density:${density} input`} />
          <IconButton density={density} iconOnly icon='ph--gear--regular' label='Settings' />
        </div>
      </Input.Root>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/playground/Density',
  render: DensityStory,
  decorators: [withTheme(), withLayoutVariants()],
} satisfies Meta<typeof DensityStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
