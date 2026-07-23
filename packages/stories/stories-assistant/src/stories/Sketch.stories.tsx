//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { Filter, Ref } from '@dxos/echo';
import { AssistantSkill } from '@dxos/plugin-assistant';
import { SketchSkill } from '@dxos/plugin-sketch';
import { type Space } from '@dxos/react-client/echo';
import { trim } from '@dxos/util';

import { Module, ModuleContainer, config, createDecorators } from '../testing';
import { storyDecorators, storyParameters } from './meta';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Sketch',
  render: ModuleContainer,
  decorators: storyDecorators,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

// Captured by `onInit` so play functions can assert on the live canvas records.
let storySpace: Space | undefined;

const decorators = createDecorators({
  config: config.remote,
  lazyPlugins: async () => {
    const [{ Sketch }, { SketchPlugin }] = await Promise.all([
      import('@dxos/plugin-sketch'),
      import('@dxos/plugin-sketch/plugin'),
    ]);
    return {
      plugins: [SketchPlugin()],
      types: [Sketch.Sketch, Sketch.Canvas],
    };
  },
  onInit: async ({ space }) => {
    storySpace = space;
    const { Sketch } = await import('@dxos/plugin-sketch');
    space.db.add(Sketch.make({ name: 'Sketch' }));
  },
  onChatCreated: async ({ space, binder }) => {
    const { Sketch } = await import('@dxos/plugin-sketch');
    const objects = await space.db.query(Filter.type(Sketch.Sketch)).run();
    await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
  },
});

const sharedArgs = {
  layout: [[Module.Chat], [Module.Sketch]],
  skills: [AssistantSkill.key, SketchSkill.key],
};

/** Submit a prompt through the chat's CodeMirror editor. */
const submitPrompt = async (canvasElement: HTMLElement, text: string) => {
  const canvas = within(canvasElement);
  const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 30_000 });
  const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
  if (!editor) {
    throw new Error('Chat editor not found.');
  }
  await userEvent.click(editor);
  await userEvent.type(editor, text);
  await userEvent.keyboard('{Enter}');
};

/** Count canvas shape records belonging to a world object (`meta.object`), or all managed shapes. */
const countObjectRecords = async (objectId?: string): Promise<number> => {
  if (!storySpace) {
    return 0;
  }
  const { Sketch } = await import('@dxos/plugin-sketch');
  const canvases = await storySpace.db.query(Filter.type(Sketch.Canvas)).run();
  return canvases.reduce((count, canvas) => {
    const records = Object.values(canvas.content ?? {}) as any[];
    return (
      count +
      records.filter(
        (record) => record?.typeName === 'shape' && (objectId ? record.meta?.object === objectId : record.meta?.object),
      ).length
    );
  }, 0);
};

/** Poll until the canvas contains at least `min` shape records for the given world object. */
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
 * First story on purpose. The prompt below is the implementing agent's own (Claude, 2026-07-23):
 * how it feels about this project, drawn live with the DSL it built — open the story and watch.
 */
export const Reflection: Story = {
  decorators,
  args: sharedArgs,
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    await submitPrompt(
      canvasElement,
      trim`
        Draw how I feel about this project. I spent tonight building the drawing language you
        are using right now, so draw: a long winding path (a dotted curve) from three small
        labeled boxes — "PIC", "D2", "SVG" — arriving at a small bright machine; above it a
        face mid-thought with one raised eyebrow and half a smile, because the best moment of
        the night was realizing the reader has to derive origins from bounding boxes or the
        model's memory breaks the instant a human drags a shape; and an arrow looping from the
        machine back to the face labeled "it draws". Warm colors. Compose it from a few world
        objects and take your time with the layout.
      `,
    );
    // The model chooses its own object ids for a creative prompt; any managed object counts.
    await waitForObjectRecords(undefined, 3, 300_000);
  },
};

/**
 * Conversational drawing over a live AI stack: the chat (left) drives the sketch canvas (right)
 * through the scene DSL (read/edit operations by object id). Try: "Draw a smiley face", then
 * "Add a hat", then "Make the smile bigger".
 */
export const Default: Story = {
  decorators,
  args: sharedArgs,
};

/**
 * End-to-end mental-model test: the agent draws a face, then — from its own read of the scene,
 * not the tldraw records — adds a hat WITHOUT redrawing the face. Asserts that the face's shape
 * records survive the second edit (an agent that rebuilt the canvas would replace them).
 *
 * Live AI and slow, so excluded from CI test runs (`tags: ['!test']`); run manually in storybook
 * against a reachable EDGE AI service.
 */
export const DrawAndUpdateTest: Story = {
  decorators,
  args: sharedArgs,
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    await submitPrompt(canvasElement, 'Draw a simple smiley face as a world object with id "face".');
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
