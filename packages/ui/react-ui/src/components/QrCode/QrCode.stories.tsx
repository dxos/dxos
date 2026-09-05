//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withTheme } from '../../testing';
import { QrCode, type QrCodeProps } from './QrCode';

const DefaultStory = (props: QrCodeProps) => (
  <div className='w-64 text-description'>
    <QrCode {...props} />
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/QrCode',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { 'value': 'https://dxos.org', 'errorCorrection': 'Q', 'aria-label': 'dxos.org' },
};

/** Encodes its value as modules in the current colour, filling its box. */
export const TestRenders: Story = {
  args: { 'value': 'https://dxos.org', 'errorCorrection': 'Q', 'aria-label': 'dxos.org' },
  play: async ({ canvasElement }) => {
    const svg = await waitFor(async () => {
      const element = canvasElement.querySelector<SVGSVGElement>('svg');
      await expect(element).not.toBeNull();
      return element!;
    });
    const path = svg.querySelector('path')!;
    await expect(path.getAttribute('d')?.length ?? 0).toBeGreaterThan(100);
    await expect(getComputedStyle(path).fill).toBe(getComputedStyle(svg).color);
    await expect(Math.round(svg.getBoundingClientRect().width)).toBe(256);
    within(canvasElement);
  },
};
