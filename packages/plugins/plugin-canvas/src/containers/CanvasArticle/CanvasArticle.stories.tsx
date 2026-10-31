//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type ContentMap, Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { type Database, Obj, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { random } from '@dxos/random';
import { DEFAULT_CELL } from '@dxos/react-ui-canvas';
import { toEcho } from '@dxos/scene';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';
import { trim } from '@dxos/util';

import * as CanvasPlugin from '#meta';
import { linkKey, nodeKey } from '#model';
import { translations } from '#translations';
import { Canvas } from '#types';

import types from '../../capabilities/schema.ts';
import { addTestCanvas } from '../../testing/canvas.ts';

random.seed(1234);

/** Fills a new canvas's open scene through content records keyed under its `root` scene. */
type Seed = (db: Database.Database, content: ContentMap, root: string) => void;

// The drawing is opened through the illustrator's article surface, as the app opens it, so the story
// covers the variant dispatch as well as the dimension's article it lands on.
const withDrawing = (
  seed: Seed = () => {},
  role: typeof AppSurface.Article | typeof AppSurface.Slide = AppSurface.Article,
) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, Markdown.Document, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), MarkdownPlugin.make()],
    onInit: async ({ space }) => {
      const canvas = addTestCanvas(space.db, (content, root) => seed(space.db, content, root));
      const drawing = space.db.add(Drawing.make({ name: 'Canvas', canvas }));
      await space.db.flush();
      return [[role === AppSurface.Article ? Cell.article(drawing) : { object: drawing, token: role }]];
    },
  });

/** A canvas over scenes written in `.dx`, opened through the illustrator's article as the app opens it. */
const withScenes = (text: string) =>
  createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
    onInit: async ({ space }) => {
      const stored = toEcho(Dsl.readScenes(text).document);
      [...stored.models.values(), ...stored.layouts.values(), ...stored.scenes.values()].forEach((object) =>
        space.db.add(object),
      );
      const model = stored.models.values().next().value;
      const canvas = space.db.add(
        Obj.make(Canvas.Canvas, {
          settings: {},
          ...(model ? { model: Ref.make(model) } : {}),
          layouts: [...stored.layouts.values()].map((layout) => Ref.make(layout)),
          scenes: [
            Ref.make(stored.root),
            ...[...stored.scenes.values()].filter((scene) => scene !== stored.root).map((scene) => Ref.make(scene)),
          ],
        }),
      );
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

// A -> B -> C: three boxes in a row joined by smart lines, enough of a drawing to see the shapes, links and theme.
const seedBasic: Seed = (_db, content, scene) => {
  const box = (id: string, x: number, z: string) => ({
    kind: 'node',
    scene,
    node: {
      id,
      type: 'rect',
      z,
      label: id.toUpperCase(),
      center: { x, y: 0 },
      size: { width: 4 * DEFAULT_CELL, height: 2 * DEFAULT_CELL },
    },
  });
  const link = (source: string, target: string, z: string) => ({
    kind: 'link',
    scene,
    link: {
      id: `${source}-${target}`,
      type: 'smart',
      z,
      source: { node: source },
      target: { node: target },
      ends: { end: 'arrow' },
    },
  });
  content[nodeKey('a')] = box('a', -384, 'a1');
  content[nodeKey('b')] = box('b', 0, 'a2');
  content[nodeKey('c')] = box('c', 384, 'a3');
  content[linkKey('a-b')] = link('a', 'b', 'a4');
  content[linkKey('b-c')] = link('b', 'c', 'a5');
};

export const Default: Story = {
  decorators: withDrawing(seedBasic),
};

/**
 * Test:
 * 1. The scene view mounts through the illustrator's article surface.
 * 2. The navigation, action and debug toolbars and the palette all show.
 */
export const Test: Story = {
  decorators: withDrawing(seedBasic),
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

/**
 * A drawing on a slide is a picture: read-only, with no toolbar, palette or panels.
 *
 * Test:
 * 1. The scene view mounts through the illustrator's slide surface.
 * 2. No toolbar and no palette show.
 */
export const Slide: Story = {
  decorators: withDrawing(seedBasic, AppSurface.Slide),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    await expect(await view.findByTestId('scene-view', undefined, { timeout: 30_000 })).toBeInTheDocument();
    await expect(canvasElement.querySelector('[role="toolbar"]')).toBeNull();
    await expect(view.queryByTestId('palette')).toBeNull();
    // Transparent: nothing from the scene up to the article's panel paints a background, so a slide shows through.
    const scene = await view.findByTestId('scene-view');
    const panel = scene.closest('.dx-panel');
    const painted: string[] = [];
    for (
      let element: Element | null = scene;
      element && element !== panel?.parentElement;
      element = element.parentElement
    ) {
      const color = getComputedStyle(element).backgroundColor;
      if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        painted.push(`${element.tagName}.${element.className}: ${color}`);
      }
    }
    await expect(painted).toEqual([]);
    await expect(canvasElement.querySelector('[data-testid="scene-background-fill"]')).toBeNull();
  },
};

/** View nodes holding a markdown document, which is no canvas drawing, show its card and its section surfaces. */
export const ObjectView: Story = {
  decorators: withDrawing((db, content, root) => {
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
      scene: root,
      node: {
        id,
        type: 'view',
        z: id === 'card' ? 'a1' : 'a2',
        center: { x, y: 0 },
        size: { width: cells.width * DEFAULT_CELL, height: cells.height * DEFAULT_CELL },
        scene: id,
        link: { object: Ref.make(document), role },
      },
    });
    for (const id of ['card', 'section']) {
      content[`scene:${id}`] = { kind: 'scene', id };
    }
    content[nodeKey('card')] = frame('card', -384, 'card', { width: 4, height: 4 });
    content[nodeKey('section')] = frame('section', 256, 'section', { width: 8, height: 10 });
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
    // Until a frame is clicked its content is inert, so a press anywhere on the frame moves it.
    await expect(surfaceOf('section')).toHaveClass('pointer-events-none');
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

/**
 * Image shapes, linked by URL in their properties.
 *
 * Test:
 * 1. The palette offers the image tool (I).
 * 2. An image with no URL, or one that is not a web link, shows the placeholder rather than following the link.
 */
export const Image: Story = {
  decorators: withDrawing((_db, content, root) => {
    const image = (id: string, x: number, src?: string) => ({
      kind: 'node',
      scene: root,
      node: {
        id,
        type: 'image',
        z: `a${x}`,
        center: { x, y: 0 },
        size: { width: 4 * DEFAULT_CELL, height: 3 * DEFAULT_CELL },
        ...(src ? { src } : {}),
      },
    });
    content[nodeKey('empty')] = image('empty', -320);
    content[nodeKey('unsafe')] = image('unsafe', 320, 'javascript:alert(1)');
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('scene-view', undefined, { timeout: 30_000 })).toBeInTheDocument();
    // 1. The tool.
    await expect(await canvas.findByTestId('canvas.tool.node:image')).toBeInTheDocument();
    // 2. Placeholders, no image element.
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-testid="image-placeholder"]')).toHaveLength(2));
    await expect(canvasElement.querySelector('[data-testid="image-node"]')).toBeNull();
  },
};

/** A 2D canvas (A → B → C) written in `.dx`: the canvas's palette, actions, inspectors and display panel. */
export const Canvas2D: Story = { decorators: withScenes(EXEMPLARS.links) };

/**
 * A 3D canvas, a single plain cube written in `.dx`, under the same floating panels as 2D.
 * 1. Click selects; Move, Rotate or Scale puts a gizmo on it; Undo and Redo step back and forth.
 * 2. Orbit (or the middle button) orbits; shift or the right button pans; the wheel zooms.
 * 3. Cube or Sphere places one where the pointer meets the ground.
 * 4. The display panel toggles the ground grid and picks the look; both are this viewer's own, like the orbit.
 */
export const Canvas3D: Story = {
  decorators: withScenes(trim`
    scene cube dim=3d layout=cube name="Cube" {
      camera target=0,1,0 yaw=-45 pitch=30 distance=8 fov=0.8 projection=perspective
    }

    layout cube dim=3d model=library {
      element box cube @ 0,1,0 scale=2 hue=blue surface=solid
    }

    model library dim=3d {
    }
  `),
};
