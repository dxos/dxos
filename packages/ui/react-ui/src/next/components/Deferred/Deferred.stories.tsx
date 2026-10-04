//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Switch from '../Switch/Switch.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as Deferred from './Deferred.tsx';

type StoryArgs = SizeArgs & Pick<Deferred.DeferredProps, 'delay' | 'minDuration'>;

const DefaultStory = ({ delay, minDuration }: StoryArgs) => {
  const [pending, setPending] = useState(false);
  return (
    <>
      <Switch.Switch label='Pending' checked={pending} onCheckedChange={({ checked }) => setPending(checked)} />
      <Deferred.Deferred
        pending={pending}
        delay={delay}
        minDuration={minDuration}
        fallback={() => <Typography.Text data-testid='fallback'>No messages yet.</Typography.Text>}
      >
        <Typography.Text data-testid='content'>3 messages</Typography.Text>
      </Deferred.Deferred>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Deferred',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', delay: 500, minDuration: 1_000 },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A brief pending state never shows the fallback; a lasting one does, and holds it for `minDuration`. */
export const Test: Story = {
  args: { delay: 300, minDuration: 600 },
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const toggle = canvas.getByRole('switch', { name: 'Pending' });

    // Shorter than `delay`: the content stays.
    await userEvent.click(toggle);
    await userEvent.click(toggle);
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(canvas.queryByTestId('fallback')).toBeNull();
    await expect(canvas.getByTestId('content')).toBeVisible();

    // Longer than `delay`: the fallback replaces the content.
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.getByTestId('fallback')).toBeVisible());
    await expect(canvas.queryByTestId('content')).toBeNull();

    // Content arriving at once still waits out `minDuration`.
    const cleared = Date.now();
    await userEvent.click(toggle);
    await expect(canvas.getByTestId('fallback')).toBeVisible();
    await waitFor(() => expect(canvas.getByTestId('content')).toBeVisible());
    await expect(Date.now() - cleared).toBeGreaterThanOrEqual(200);
  },
};
