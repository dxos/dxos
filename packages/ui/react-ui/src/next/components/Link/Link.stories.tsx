//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { realHover, realUnhover, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Typography from '../Typography/Typography.tsx';
import { Link, type LinkProps } from './Link.tsx';

type StoryArgs = SizeArgs & Pick<LinkProps, 'variant'>;

const DefaultStory = ({ variant }: StoryArgs) => (
  <Typography.Text data-testid='text'>
    Read the <Link href='https://dxos.org/guide'>guide</Link>, published{' '}
    <Link href='https://github.com/dxos/dxos/releases' variant='neutral'>
      2 days ago
    </Link>
    , or open the{' '}
    <Link asChild variant={variant}>
      <a href='#changelog' target='_self'>
        changelog
      </a>
    </Link>
    .
  </Typography.Text>
);

const meta = {
  title: 'ui/react-ui-core/components/Link',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', variant: 'accent' },
  argTypes: { ...SIZE_ARG_TYPES, variant: { control: 'radio', options: ['accent', 'neutral'] } },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Links open in a new tab by default; accent links are coloured, neutral ones keep the text colour and underline. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const text = canvas.getByTestId('text');

    const guide = canvas.getByRole('link', { name: 'guide' });
    await expect(guide).toHaveAttribute('target', '_blank');
    await expect(guide).toHaveAttribute('rel', 'noreferrer');
    await expect(getComputedStyle(guide).color).not.toBe(getComputedStyle(text).color);
    await expect(getComputedStyle(guide).fontSize).toBe(getComputedStyle(text).fontSize);

    // Neutral keeps the text colour and underlines on hover.
    const released = canvas.getByRole('link', { name: '2 days ago' });
    await expect(getComputedStyle(released).color).toBe(getComputedStyle(text).color);
    await realHover(released);
    await waitFor(() => expect(getComputedStyle(released).textDecorationLine).toBe('underline'));
    await realUnhover(released);

    // `asChild` styles the child, whose own `target` wins.
    const changelog = canvas.getByRole('link', { name: 'changelog' });
    await expect(changelog).toHaveAttribute('data-scope', 'link');
    await expect(changelog).toHaveAttribute('target', '_self');

    // Keyboard focus shows the ring.
    guide.blur();
    await userEvent.tab();
    await expect(guide).toHaveFocus();
    await expect(getComputedStyle(guide).boxShadow).not.toBe('none');
  },
};
