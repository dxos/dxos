//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { QrCode, type QrCodeProps } from '../index.ts';

type StoryArgs = Pick<QrCodeProps, 'value' | 'errorCorrection' | 'icon'>;

const DefaultStory = ({ value, errorCorrection, icon }: StoryArgs) => (
  <div className='grid grid-cols-2 gap-8 text-fg-muted'>
    <QrCode value={value} errorCorrection={errorCorrection} icon={icon} label='Invitation' data-testid='code' />
    <div>
      <QrCode value={value} errorCorrection='L' aria-labelledby='qr-label' data-testid='labelled' />
      <span id='qr-label'>Scan to join</span>
    </div>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/QrCode',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-4 w-[32rem]' }), withTheme()],
  args: { value: 'https://dxos.org', errorCorrection: 'Q', icon: 'ph--planet--regular' },
  argTypes: { errorCorrection: { control: 'select', options: ['L', 'M', 'Q', 'H'] } },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The code is a labelled square image filling its host's width, drawn in the text colour; the icon is centred. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const code = canvas.getByRole('img', { name: 'Invitation' });
    await expect(code).toHaveAttribute('data-scope', 'qr-code');
    await expect(canvas.getByRole('img', { name: 'Scan to join' })).toBeInTheDocument();

    const svg = await waitFor(() => {
      const element = code.querySelector<SVGSVGElement>('[data-part="frame"]');
      if (!element) {
        throw new Error('No frame');
      }
      return element;
    });
    const path = svg.querySelector('[data-part="pattern"]');
    await expect(path?.getAttribute('d')?.length ?? 0).toBeGreaterThan(100);
    await expect(path ? getComputedStyle(path).fill : '').toBe(getComputedStyle(code).color);

    // A square the width of its column.
    const rect = code.getBoundingClientRect();
    const host = code.parentElement?.getBoundingClientRect();
    await expect(rect.height).toBeCloseTo(rect.width, 0);
    await expect(rect.width).toBeGreaterThan(((host?.width ?? 0) - 32) / 2 - 1);
    await expect(svg.getBoundingClientRect().width).toBeCloseTo(rect.width, 0);

    // The overlay is a fifth of the code, centred.
    const overlay = code.querySelector<HTMLElement>('[data-part="overlay"]');
    const overlayRect = overlay?.getBoundingClientRect();
    await expect(overlayRect?.width ?? 0).toBeCloseTo(rect.width / 5, 0);
    await expect((overlayRect?.left ?? 0) + (overlayRect?.width ?? 0) / 2).toBeCloseTo(rect.left + rect.width / 2, 0);
    await expect(overlay?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    // Lower error correction needs fewer modules.
    const low = canvas.getByTestId('labelled').querySelector('[data-part="frame"]');
    await expect(low?.getAttribute('viewBox')).not.toBe(svg.getAttribute('viewBox'));
  },
};
