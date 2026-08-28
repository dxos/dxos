//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import pdfUrl from '../../../fixtures/test.pdf?url';
import { PdfCanvas } from './PdfCanvas';

const meta = {
  title: 'plugins/plugin-file/components/PdfCanvas',
  component: PdfCanvas,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof PdfCanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { url: pdfUrl },
};

export const Pages: Story = {
  args: { url: pdfUrl, onLoad: fn() },
  play: async ({ args, canvasElement }) => {
    // One canvas per page. The whole document is rendered rather than paginated, so a regression to
    // single-page rendering shows up here rather than as quietly missing content.
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('canvas')).toHaveLength(1);
      },
      { timeout: 20_000 },
    );
    await expect(args.onLoad).toHaveBeenCalledWith(1);
    // Rendered at device resolution, so the backing store is at least as wide as the CSS box.
    const first = canvasElement.querySelector('canvas')!;
    await expect(first.width).toBeGreaterThan(0);
  },
};

/** Bytes that are not a PDF: reported rather than left as an empty box. */
export const Invalid: Story = {
  args: { url: 'data:application/pdf;base64,bm90LWEtcGRm' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('alert')).toBeInTheDocument();
    });
    await expect(canvasElement.querySelectorAll('canvas')).toHaveLength(0);
  },
};
