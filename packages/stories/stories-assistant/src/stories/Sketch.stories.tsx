//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Ref } from '@dxos/echo';
import * as AssistantSkill from '@dxos/plugin-assistant/AssistantSkill';
import * as DrawingSkill from '@dxos/plugin-illustrator/DrawingSkill';
import { type Space } from '@dxos/react-client/echo';
import { Cell } from '@dxos/storybook-testing';
import { trim } from '@dxos/util';

import { StoryRole } from '../modules/index.ts';
import {
  ModuleContainer,
  addToRootCollection,
  createDecorators,
  storyParameters,
  submitPrompt,
} from '../testing/index.ts';
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Sketch',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

// Captured by `onInit` so play functions can assert on the live canvas records.
let storySpace: Space | undefined;

const decorators = createDecorators({
  lazyPlugins: async () => {
    const [{ Drawing }, IllustratorPlugin, CanvasPlugin] = await Promise.all([
      import('@dxos/plugin-illustrator'),
      import('@dxos/plugin-illustrator/IllustratorPlugin'),
      import('@dxos/plugin-canvas/CanvasPlugin'),
    ]);
    return {
      plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
      types: [Drawing.Drawing, Drawing.Canvas],
    };
  },
  onInit: async ({ space }) => {
    storySpace = space;
    const [{ Drawing }, { Canvas }] = await Promise.all([
      import('@dxos/plugin-illustrator'),
      import('@dxos/plugin-canvas'),
    ]);
    // Empty content: the canvas variant seeds its root scene on first bind or first edit.
    const drawing = space.db.add(
      Drawing.make({ name: 'Drawing', canvas: Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA }) }),
    );
    addToRootCollection(space, [drawing]);
    return [[StoryRole.Chat], [Cell.article(drawing)], [AppSurface.deckCompanion('trace')]];
  },
  onChatCreated: async ({ db, binder }) => {
    const { Drawing } = await import('@dxos/plugin-illustrator');
    const objects = await db.query(Filter.type(Drawing.Drawing)).run();
    await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
  },
  skills: [AssistantSkill.key, DrawingSkill.key],
});

/** Count canvas node and link records belonging to a world object (`dsl.object`), or all managed records. */
const countObjectRecords = async (objectId?: string): Promise<number> => {
  if (!storySpace) {
    return 0;
  }
  const { Drawing } = await import('@dxos/plugin-illustrator');
  const canvases = await storySpace.db.query(Filter.type(Drawing.Canvas)).run();
  return canvases.reduce((count, canvas) => {
    const records = Object.values(canvas.content ?? {}) as any[];
    return (
      count +
      records.filter(
        (record) =>
          (record?.kind === 'node' || record?.kind === 'link') &&
          (objectId ? record.dsl?.object === objectId : record.dsl?.object),
      ).length
    );
  }, 0);
};

/** Poll until the canvas contains at least `min` element records for the given world object. */
const waitForObjectRecords = async (objectId: string | undefined, min = 1, timeout = 240_000): Promise<number> => {
  const deadline = Date.now() + timeout;
  let count = 0;
  while (Date.now() < deadline) {
    count = await countObjectRecords(objectId);
    if (count >= min) {
      return count;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for shapes of object "${objectId ?? '*'}" (last=${count})`);
};

/**
 * Conversational drawing over a live AI stack: the chat (left) drives the sketch canvas (right)
 * through the scene DSL (read/edit operations by object id). The canvas renders boxes, ellipses,
 * text and bound arrows only — lines, curves and arcs are dropped. Try: "Draw a web server talking
 * to a database", then "Add a cache between them", then "Make the database green".
 */
export const Default: Story = {
  decorators,
};

/**
 * First story on purpose. The prompt below is the implementing agent's own (Claude, 2026-07-23):
 * how it feels about this project, drawn live with the DSL it built — open the story and watch.
 */
export const Reflection: Story = {
  decorators,
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    // Single line: typed newlines insert literal line breaks in the prompt editor.
    const prompt = trim`
      Draw how I feel about this project. I spent tonight building the drawing language you
      are using right now, so draw: three small labeled boxes — "PIC", "D2", "SVG" — each
      joined by an arrow to a small bright "machine" box; above it a face mid-thought built
      from ellipses (two eyes, one larger than the other), because the best moment of the
      night was realizing the reader has to derive origins from bounding boxes or the model's
      memory breaks the instant a human drags a shape; and an
      arrow from the machine back to the face labeled "it draws". Warm colors. This canvas
      draws boxes, ellipses, text and arrows bound to elements only — no lines, curves or
      arcs. Compose it from a few world objects and take your time with the layout.
    `.replace(/\s*\n\s*/g, ' ');
    await submitPrompt(canvasElement, prompt);
    // The model chooses its own object ids for a creative prompt; any managed object counts.
    await waitForObjectRecords(undefined, 3, 300_000);
  },
};

/**
 * End-to-end mental-model test: the agent draws a face, then — from its own read of the scene,
 * not the canvas records — adds a hat WITHOUT redrawing the face. Asserts that the face's shape
 * records survive the second edit (an agent that rebuilt the canvas would replace them).
 *
 * Live AI and slow, so excluded from CI test runs (`tags: ['!test']`); run manually in storybook
 * against a reachable EDGE AI service.
 */
export const DrawAndUpdateTest: Story = {
  decorators,
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    await submitPrompt(
      canvasElement,
      'Draw a simple face as a world object with id "face", using only ellipses and text.',
    );
    const faceShapes = await waitForObjectRecords('face', 3);

    await submitPrompt(canvasElement, 'Now add a hat (object id "hat") on top of the face. Do not redraw the face.');
    await waitForObjectRecords('hat', 1);

    // The face must survive the follow-up edit — proof the agent edited the scene it read
    // back rather than regenerating the canvas.
    const remaining = await countObjectRecords('face');
    if (remaining < faceShapes) {
      throw new Error(`face was redrawn: ${remaining} of ${faceShapes} shapes remain`);
    }
  },
};
