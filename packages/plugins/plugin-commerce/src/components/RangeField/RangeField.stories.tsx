//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { RangeField, type RangeValue } from './RangeField';

const DefaultStory = (props: { label?: string; value?: RangeValue }) => {
  const [value, setValue] = useState<RangeValue | undefined>(props.value);
  // Sync when the `value` control changes (useState only reads the initial arg).
  useEffect(() => setValue(props.value), [props.value]);
  return <RangeField label={props.label} value={value} onValueChange={setValue} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-commerce/RangeField',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[20rem]' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Price',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Price',
    value: { min: 5000, max: 25000 },
  },
};
