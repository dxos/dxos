//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Empty } from './Empty.tsx';

/** The translated default, then an icon with the caller's own text. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Empty data-testid={`default-${size}`} />
    <Empty icon='ph--tray--regular' data-testid={`custom-${size}`}>
      No documents yet
    </Empty>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Empty',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[24rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * An empty state is a status message, "No items" unless given text; its decorative icon is block-sized and hidden from
 * assistive tech, and both are centred in the content track.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    await expectScoped(canvasElement);
    const canvas = within(sizeRow(canvasElement, 'md'));
    const [fallback, custom] = canvas.getAllByRole('status');
    await expect(fallback).toHaveTextContent('No items');
    await expect(custom).toHaveTextContent('No documents yet');
    await expect(fallback.querySelector('svg')).toBeNull();

    for (const size of SIZES) {
      const root = byTestId(canvasElement, `custom-${size}`);
      const icon = root.querySelector('svg');
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
      const rootRect = root.getBoundingClientRect();
      const iconRect = icon?.getBoundingClientRect();
      await expect(iconRect?.width, size).toBeCloseTo(GEOMETRY[size].block, 0);
      await expect((iconRect?.left ?? 0) + (iconRect?.width ?? 0) / 2, size).toBeCloseTo(
        rootRect.left + rootRect.width / 2,
        0,
      );
    }
  },
};
