//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, within } from 'storybook/test';

import { Input, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Placeholder } from './Placeholder';

const meta = {
  title: 'apps/composer-app/Placeholder',
  component: Placeholder,
  render: () => {
    const [stage, setStage] = useState(0);
    const [auto, setAuto] = useState(false);
    useEffect(() => {
      if (!auto) {
        return;
      }

      const interval = setInterval(() => {
        setStage((prev) => {
          return prev >= 2 ? 0 : prev + 1;
        });
      }, 3_000);

      return () => clearInterval(interval);
    }, [auto]);

    return (
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root classNames='gap-2'>
            <Input.Root>
              <Input.Checkbox checked={auto} onCheckedChange={(checked) => setAuto(checked === true)} />
              <Input.Label>Auto</Input.Label>
            </Input.Root>
            <Toolbar.Button onClick={() => setStage((prev) => (prev < 2 ? prev + 1 : 0))}>Next</Toolbar.Button>
            <Toolbar.Text>{stage}</Toolbar.Text>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <Placeholder stage={stage} />
        </Panel.Content>
      </Panel.Root>
    );
  },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  tags: ['test'],
} satisfies Meta<typeof Placeholder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    stage: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Smoke test: verify the component renders with the status indicator.
    await expect(canvas.getByLabelText('Initializing')).toBeInTheDocument();
  },
};
