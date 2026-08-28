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
    // single-page rendering shows up here rather than as quietly missing content. The expected count
    // comes from the document itself, so replacing the fixture does not silently weaken the test.
    await waitFor(async () => await expect(args.onLoad).toHaveBeenCalled(), { timeout: 20_000 });
    const pages = (args.onLoad as ReturnType<typeof fn>).mock.calls[0][0] as number;
    await expect(pages).toBeGreaterThan(1);
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('[data-page] canvas')).toHaveLength(pages);
      },
      { timeout: 20_000 },
    );
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
    await expect(canvasElement.querySelectorAll('[data-page] canvas')).toHaveLength(0);
  },
};
