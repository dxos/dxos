//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { createDemoPresentation } from '../testing/demoPresentation.ts';
import {
  PresentationStory,
  presentationStoryDecorators,
  presentationStoryParameters,
} from '../testing/presenterStory.tsx';

const meta = {
  title: 'plugins/plugin-presenter/stories/Demo',
  render: PresentationStory,
  decorators: presentationStoryDecorators({
    slideSurface: true,
    onCreateSpace: async ({ space }) => {
      createDemoPresentation(space.db);
      await space.db.flush({ indexes: true });
    },
  }),
  parameters: presentationStoryParameters,
} satisfies Meta<typeof PresentationStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The demo presentation to browse by hand; no interaction runs. */
export const Default: Story = {};

const DATA_URI_IMAGE = '[style*="data:image/svg+xml"]';

/** Presents and steps through every owned layout (image-right, image over text, full-bleed image) to the linked documents. */
export const Demo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const next = async (position: number) => {
      await userEvent.keyboard('{ArrowRight}');
      // The fullscreen pager fades in and out, so it is checked for presence, not visibility.
      await expect(await canvas.findByText(`${position} / 10`)).toBeInTheDocument();
    };

    await canvas.findByTestId('presenter.slide-grid.9', undefined, { timeout: 10_000 });
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    // The article shows every slide as a thumbnail, so each one is checked alone by presenting; fullscreen fades in once
    // its size settles, so visibility is awaited.
    await userEvent.keyboard('f');
    await expect(await canvas.findByTestId('presenter.overlay')).toBeInTheDocument();
    await expect(await canvas.findByText('1 / 10')).toBeInTheDocument();
    await next(2);
    await next(3);
    await next(4);
    await next(5);
    await waitFor(() => expect(canvasElement.querySelector('pre code')).not.toBeNull());

    await next(6);
    const columns = await canvas.findByRole('heading', { name: 'Columns' });
    await waitFor(() => expect(columns).toBeVisible());
    await waitFor(() => expect(canvasElement.querySelector('[data-layout="image-right"] [data-image]')).not.toBeNull());
    await waitFor(() => expect(canvasElement.querySelector(DATA_URI_IMAGE)).not.toBeNull());

    await next(7);
    const rows = await canvas.findByRole('heading', { name: 'Rows' });
    await waitFor(() => expect(rows).toBeVisible());
    await waitFor(() => expect(canvasElement.querySelector('[data-layout="image"]')).not.toBeNull());
    await waitFor(() => expect(canvasElement.querySelector(DATA_URI_IMAGE)).not.toBeNull());

    await next(8);
    await waitFor(() => expect(canvasElement.querySelector(DATA_URI_IMAGE)).not.toBeNull());
    await expect(canvas.queryByRole('heading', { name: 'Rows' })).toBeNull();

    await next(9);
    await expect(await canvas.findByRole('heading', { name: 'Linked document' }, { timeout: 5_000 })).toBeVisible();
    await next(10);
    await expect(await canvas.findByRole('heading', { name: 'Another document' })).toBeVisible();
  },
};
