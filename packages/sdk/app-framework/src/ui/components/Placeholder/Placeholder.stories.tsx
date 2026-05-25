//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, within } from 'storybook/test';

import { Composer } from '@dxos/brand';
import { Input, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Placeholder } from './Placeholder';

/**
 * The story renders the brand-agnostic `Placeholder` from `@dxos/app-framework/ui`
 * with the Composer brand icon as its `logo`, so the storybook mirrors what
 * composer-app actually mounts in production. The render function form lets
 * the SVG accept the placeholder's animation `className` directly.
 */
const meta = {
  title: 'sdk/app-framework/components/Placeholder',
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
          <Placeholder stage={stage} logo={(logoProps) => <Composer {...logoProps} />} />
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
    // Smoke test: the toolbar's `Next` button is rendered alongside the
    // placeholder, so the story mounted without throwing.
    await expect(canvas.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  },
};
