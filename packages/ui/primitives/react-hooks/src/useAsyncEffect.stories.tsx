//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { useAsyncEffect } from './useAsyncEffect';

let count = 0;

const meta: Meta = {
  title: 'ui/react-hooks/useAsyncEffect',
  render: () => {
    const [value, setValue] = useState(0);
    useAsyncEffect(async () => {
      setValue(++count);
    });

    return <div>{value}</div>;
  },
  play: () => {
    console.log(count);
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
