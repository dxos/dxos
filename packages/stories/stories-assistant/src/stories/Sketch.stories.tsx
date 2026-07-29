//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Ref } from '@dxos/echo';
import { AssistantSkill } from '@dxos/plugin-assistant';
import { DrawingSkill } from '@dxos/plugin-illustrator';
import { type Space } from '@dxos/react-client/echo';
import { Cell } from '@dxos/storybook-testing';
import { trim } from '@dxos/util';

import { StoryRole } from '../modules';
import { ModuleContainer, addToRootCollection, createDecorators, storyParameters } from '../testing';
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
    const [{ Drawing }, { IllustratorPlugin }, { Tldraw }, { TldrawPlugin }] = await Promise.all([
      import('@dxos/plugin-illustrator'),
      import('@dxos/plugin-illustrator/plugin'),
      import('@dxos/plugin-tldraw'),
      import('@dxos/plugin-tldraw/plugin'),
    ]);
    return {
      plugins: [IllustratorPlugin(), TldrawPlugin()],
      types: [Drawing.Drawing, Drawing.Canvas],
    };
  },
  onInit: async ({ space }) => {
    storySpace = space;
    const [{ Drawing }, { Tldraw }] = await Promise.all([
      import('@dxos/plugin-illustrator'),
      import('@dxos/plugin-tldraw'),
    ]);
    const drawing = space.db.add(
      Drawing.make({ name: 'Drawing', canvas: Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA }) }),
    );
    addToRootCollection(space, [drawing]);
    return [[StoryRole.Chat], [Cell.article(drawing)], [AppSurface.deckCompanion('trace')]];
  },
  onChatCreated: async ({ space, binder }) => {
    const { Drawing } = await import('@dxos/plugin-illustrator');
    const objects = await space.db.query(Filter.type(Drawing.Drawing)).run();
    await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
  },
  skills: [AssistantSkill.key, DrawingSkill.key],
});

/**
 * Submit a prompt through the chat's CodeMirror editor. Submission is dropped silently while the
 * runtime is still activating or a previous response is streaming, so retry until the message
 * actually shows up in the thread (the editor clearing is NOT proof of submission).
 */
const submitPrompt = async (canvasElement: HTMLElement, text: string) => {
  const canvas = within(canvasElement);
  const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 60_000 });
  const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
  if (!editor) {
    throw new Error('Chat editor not found.');
  }
  const needle = text.slice(0, 30);
  // The prompt editor itself holds the text until it clears; anywhere else (the thread renders
  // sent messages in their own read-only CodeMirror) counts as submitted.
  const promptRoot = editor.closest('.cm-editor');
  const submitted = () =>
    [...canvasElement.querySelectorAll('*')].some(
      (node) =>
        node.childElementCount === 0 && node.closest('.cm-editor') !== promptRoot && node.textContent?.includes(needle),
    );
  for (let attempt = 0; attempt < 20; attempt++) {
    if (!editor.textContent?.includes(needle)) {
      await userEvent.click(editor);
      await userEvent.type(editor, text);
    }
    await userEvent.keyboard('{Enter}');
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (submitted()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error('Prompt did not reach the thread.');
};

/** Count canvas shape records belonging to a world object (`meta.object`), or all managed shapes. */
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
 * Conversational drawing over a live AI stack: the chat (left) drives the sketch canvas (right)
 * through the scene DSL (read/edit operations by object id). Try: "Draw a smiley face", then
 * "Add a hat", then "Make the smile bigger".
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
      are using right now, so draw: a long winding path (a dotted curve) from three small
      labeled boxes — "PIC", "D2", "SVG" — arriving at a small bright machine; above it a
      face mid-thought with one raised eyebrow and half a smile, because the best moment of
      the night was realizing the reader has to derive origins from bounding boxes or the
      model's memory breaks the instant a human drags a shape; and an arrow looping from the
      machine back to the face labeled "it draws". Warm colors. Compose it from a few world
      objects and take your time with the layout.
    `.replace(/\s*\n\s*/g, ' ');
    await submitPrompt(canvasElement, prompt);
    // The model chooses its own object ids for a creative prompt; any managed object counts.
    await waitForObjectRecords(undefined, 3, 300_000);
  },
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
