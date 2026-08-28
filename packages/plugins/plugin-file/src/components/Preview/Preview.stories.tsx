//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import pdfUrl from '../../../fixtures/test.pdf?url';
import { Preview } from './Preview';

/** A 3×2 PNG, small enough to inline and large enough to have measurable dimensions. */
const PNG_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAADZm76WAAAAF0lEQVQI12P8z8DAwMDAxMDAwMDAwAAADgEBAaMHRJcAAAAASUVORK5CYII=';

const DefaultStory = ({ type, url }: { type: string; url: string }) => (
  <Panel.Root>
    <Preview.Root type={type} url={url}>
      <Panel.Toolbar asChild>
        <Preview.Toolbar />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Preview.Content />
      </Panel.Content>
    </Preview.Root>
  </Panel.Root>
);

const meta = {
  title: 'plugins/plugin-file/components/Preview',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { type: 'application/pdf', url: pdfUrl },
};

export const Image: Story = {
  args: { type: 'image/png', url: PNG_URL },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const image = canvasElement.querySelector('img');
      await expect(image).not.toBeNull();
      await expect(image!.getAttribute('src')).toBe(PNG_URL);
    });
  },
};

export const Pdf: Story = {
  args: { type: 'application/pdf', url: pdfUrl },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A canvas per page, and the count surfaced in the toolbar — the toolbar reads state the
    // content discovers, which is the reason Root/Toolbar/Content are separate parts at all.
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('canvas')).toHaveLength(1);
      },
      { timeout: 20_000 },
    );
    await expect(canvas.getByText('1 page')).toBeInTheDocument();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

/** Not a PDF: the content reports it rather than rendering an empty box. */
export const Invalid: Story = {
  args: { type: 'application/pdf', url: 'data:application/pdf;base64,bm90LWEtcGRm' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('alert')).toBeInTheDocument();
    });
    await expect(canvasElement.querySelectorAll('canvas')).toHaveLength(0);
  },
};

/** A type with no preview branch falls back to a download link. */
export const Unsupported: Story = {
  args: { type: 'application/octet-stream', url: 'data:application/octet-stream;base64,AQID' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Download file')).toBeInTheDocument();
  },
};
