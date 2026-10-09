//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { type Database, Obj, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { random } from '@dxos/random';
import { DEFAULT_CELL } from '@dxos/react-ui-canvas/scene';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import { createCanvas, nodeKey, rootOf } from '#model';
import { CanvasPlugin } from '#plugin';
import { translations } from '#translations';

random.seed(1234);

// The drawing is opened through the illustrator's article surface, as the app opens it, so the story
// covers the variant dispatch as well as the scene engine it lands on.
const withDrawing = (seed: (db: Database.Database, canvas: Drawing.Canvas) => void = () => {}) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, Markdown.Document],
    plugins: [IllustratorPlugin.make(), CanvasPlugin(), MarkdownPlugin.make()],
    onInit: async ({ space }) => {
      const canvas = space.db.add(createCanvas());
      seed(space.db, canvas);
      const drawing = space.db.add(Drawing.make({ name: 'Canvas', canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  });

const meta: Meta<typeof ModuleContainer> = {
  title: 'plugins/plugin-canvas/containers/CanvasArticle',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: withDrawing(),
  play: async ({ canvasElement }) => {
    // The scene view mounts only once the illustrator has resolved the canvas variant's article.
    await expect(
      await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 30_000 }),
    ).toBeInTheDocument();
    // The overlays are on by default: navigation, actions and debug each render a toolbar, beside the palette.
    await waitFor(() => expect(canvasElement.querySelectorAll('[role="toolbar"]').length).toBeGreaterThanOrEqual(3));
    await expect(await within(canvasElement).findByTestId('palette')).toBeInTheDocument();
  },
};

/** Frames holding a markdown document, which is no canvas drawing, show its card and its section surfaces. */
export const ObjectFrame: Story = {
  decorators: withDrawing((db, canvas) => {
    const document = db.add(
      Markdown.make({
        name: random.lorem.words(3),
        // A blank line after each paragraph, so markdown reads them as paragraphs rather than one run of lines.
        content: [`# ${random.lorem.words(4)}`, ...random.lorem.paragraphs(3).split('\n')].join('\n\n'),
      }),
    );
    // The same document twice, side by side: once as a card, once as an embedded section.
    const frame = (id: string, x: number, role: 'card' | 'section', cells: { width: number; height: number }) => ({
      kind: 'node',
      scene: rootOf(canvas.content),
      node: {
        id,
        type: 'frame',
        z: id === 'card' ? 'a0' : 'a1',
        center: { x, y: 0 },
        size: { width: cells.width * DEFAULT_CELL, height: cells.height * DEFAULT_CELL },
        scene: id,
        object: Ref.make(document),
        role,
      },
    });
    Obj.update(canvas, (canvas) => {
      for (const id of ['card', 'section']) {
        canvas.content[`scene:${id}`] = { kind: 'scene', id };
      }
      canvas.content[nodeKey('card')] = frame('card', -384, 'card', { width: 4, height: 4 });
      canvas.content[nodeKey('section')] = frame('section', 256, 'section', { width: 8, height: 10 });
    });
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 })).toBeInTheDocument();
    // Each frame resolves the document and, it being no canvas drawing, shows it in the frame's role.
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-testid="frame-surface"]')).toHaveLength(2), {
      timeout: 10_000,
    });
    const surfaceOf = (id: string) =>
      canvasElement.querySelector(`[data-node-id="${id}"] [data-testid="frame-surface"]`);
    await expect(surfaceOf('card')).toHaveAttribute('data-role', 'card');
    await expect(surfaceOf('section')).toHaveAttribute('data-role', 'section');
    // The open control floats above each frame rather than inside it.
    for (const id of ['card', 'section']) {
      const frame = canvasElement.querySelector(`[data-node-id="${id}"]`);
      await expect(frame?.querySelector('[data-testid="portal-open"]')).toBeNull();
      await expect(frame?.nextElementSibling?.querySelector('[data-testid="frame-open"]')).not.toBeNull();
    }
    // The section embeds the document's editor.
    await waitFor(() => expect(surfaceOf('section')?.querySelector('.cm-editor')).not.toBeNull(), { timeout: 10_000 });
  },
};
