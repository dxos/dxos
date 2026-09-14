//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import landscapeUrl from '../../../fixtures/landscape.pdf?url';
import longUrl from '../../../fixtures/long.pdf?url';
import pdfUrl from '../../../fixtures/test.pdf?url';
import { PdfCanvas } from './PdfCanvas.tsx';

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

/** A long document must not rasterise every page up front — that is what took the tab down. */
export const Long: Story = {
  args: { url: longUrl },
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('[data-page]')).toHaveLength(120);
      },
      { timeout: 30_000 },
    );
    // Every page is present and sized, so the scrollbar is honest...
    const pages = [...canvasElement.querySelectorAll('[data-page]')];
    await expect(pages[119].getBoundingClientRect().height).toBeGreaterThan(0);
    // ...but only those near the viewport are drawn. Measured by the inline size the renderer sets,
    // not `canvas.width`: an undrawn canvas reports the spec default of 300, so a size check passes
    // for every page whether or not anything was rasterised.
    await waitFor(async () => {
      const drawn = pages.filter((page) => page.querySelector('canvas')?.style.width).length;
      await expect(drawn).toBeGreaterThan(0);
      await expect(drawn).toBeLessThan(30);
    });
  },
};

/**
 * Landscape pages: fit-page must fit BOTH axes, or a wide page still overflows the viewport. Fit
 * mode also shows one page at a time, so only a single page is in the DOM here.
 */
export const LandscapeFitPage: Story = {
  args: { url: landscapeUrl, fit: 'page' },
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('[data-page] canvas').length).toBeGreaterThan(0);
      },
      { timeout: 20_000 },
    );
    await expect(canvasElement.querySelectorAll('[data-page]')).toHaveLength(1);
    const container = canvasElement.querySelector('[data-pdf-canvas]')!;
    const page = canvasElement.querySelector('[data-page]')!;
    // The whole page fits, rather than only its width.
    await expect(page.getBoundingClientRect().height).toBeLessThanOrEqual(container.getBoundingClientRect().height);
    await expect(page.getBoundingClientRect().width).toBeLessThanOrEqual(container.getBoundingClientRect().width);
  },
};

/** The same landscape document scrolled, where every one of its three pages is present. */
export const LandscapeFitWidth: Story = {
  args: { url: landscapeUrl, fit: 'width' },
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('[data-page]')).toHaveLength(3);
      },
      { timeout: 20_000 },
    );
    const container = canvasElement.querySelector('[data-pdf-canvas]')!;
    const page = canvasElement.querySelector('[data-page]')!;
    // Fit-width fills the width; the page is free to be taller than the viewport.
    await expect(page.getBoundingClientRect().width).toBeLessThanOrEqual(container.getBoundingClientRect().width);
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
