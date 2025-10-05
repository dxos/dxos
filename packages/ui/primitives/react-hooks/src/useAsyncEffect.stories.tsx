//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { sleep } from '@dxos/async';

import { useAsyncEffect } from './useAsyncEffect';

const meta = {
  title: 'ui/react-hooks/useAsyncEffect',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(0);
    useAsyncEffect(async (controller) => {
      await sleep(100);
      if (!controller.signal.aborted) {
        setValue((value) => value + 1);
      }
    }, []);

    return <div>{value}</div>;
  },
};
