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

/** A 4×3 PNG of three coloured rows. Generated and verified to decode — see the Image story. */
const PNG_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAGUlEQVR4nGN47mMDRwx6ZwrhiMFkxm04AgBTKBIF1eRh+AAAAABJRU5ErkJggg==';

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
    // `naturalWidth`, not just the `src` attribute: an image that fails to decode keeps its src and
    // reports `complete: true`, and MediaPlayer's onError hides it — so an attribute-only assertion
    // passes while nothing is on screen. That is exactly what a broken fixture did here once.
    await waitFor(async () => {
      const image = canvasElement.querySelector('img');
      await expect(image).not.toBeNull();
      await expect(image!.naturalWidth).toBe(4);
      await expect(image!.naturalHeight).toBe(3);
    });
  },
};

export const Pdf: Story = {
  args: { type: 'application/pdf', url: pdfUrl },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The toolbar reads state the content discovers, which is the reason Root/Toolbar/Content are
    // separate parts at all. Page-level rendering is covered by PdfCanvas' own stories.
    await waitFor(
      async () => {
        await expect(canvas.getByText('1 page')).toBeInTheDocument();
      },
      { timeout: 20_000 },
    );
    await expect(canvas.queryByRole('alert')).toBeNull();
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
