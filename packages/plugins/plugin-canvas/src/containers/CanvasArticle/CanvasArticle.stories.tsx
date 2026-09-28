//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import { createCanvas } from '#model';
import { CanvasPlugin } from '#plugin';
import { translations } from '#translations';

// The drawing is opened through the illustrator's article surface, as the app opens it, so the story
// covers the variant dispatch as well as the scene engine it lands on.
const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/CanvasArticle',
  render: ModuleContainer,
  decorators: createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas],
    plugins: [IllustratorPlugin.make(), CanvasPlugin()],
    onInit: async ({ space }) => {
      const canvas = space.db.add(createCanvas());
      const drawing = space.db.add(Drawing.make({ name: 'Canvas', canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  }),
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // The scene view mounts only once the illustrator has resolved the canvas variant's article.
    await expect(
      await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 30_000 }),
    ).toBeInTheDocument();
    // The overlays are on by default: navigation, actions and the palette each render a toolbar.
    await waitFor(() => expect(canvasElement.querySelectorAll('[role="toolbar"]').length).toBeGreaterThanOrEqual(3));
  },
};
