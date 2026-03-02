//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Placeholder } from './Placeholder';

const meta = {
  title: 'apps/composer-app/Placeholder',
  component: Placeholder,
  render: () => {
    const [stage, setStage] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setStage((prev) => {
          return prev >= 2 ? 0 : prev + 1;
        });
      }, 3_000);

      return () => clearInterval(interval);
    }, []);

    return <Placeholder stage={stage} />;
  },
  decorators: [withTheme()],
} satisfies Meta<typeof Placeholder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    stage: 0,
  },
};
