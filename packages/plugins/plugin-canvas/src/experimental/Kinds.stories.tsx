//
// Copyright 2026 DXOS.org
//

//
// One story per element kind the studio deck draws, each on a canvas of its own. The deck's slides show a kind in
// place, among the others; this shows it alone, at a size where its parts are legible — which is what a kind is
// worked on at, and what a reader of `registry.ts` wants to see next to the table.
//
// The three generated kinds (`plank`, `app-frame`, `substrate`, and the space graph) take their configuration from
// the slide that places them, through `studioComponentData`: their geometry is the sidecar's, so a story that
// invented it would show a different element from the one the deck draws.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { expect, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { type ContentMap } from '@dxos/diagram';
import { DXN } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { elementId, nodeKey } from '@dxos/react-ui-canvas';
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';

import * as CanvasPlugin from '#meta';
import { translations } from '#translations';
import { CanvasCapabilities } from '#types';

import types from '../capabilities/schema.ts';
import { addTestCanvas } from '../testing/canvas.ts';
import { STUDIO_CARD_SIZE } from './card-template.ts';
import { STUDIO_CARD_COMPOSITE } from './CardComposite.ts';
import { STUDIO_KINDS } from './registry.ts';
import { studioSlide } from './slides.ts';
import { STUDIO_CANVAS, type StudioModel, studioComponentData } from './studio.ts';

const StudioKindsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.canvasStudioKind'), name: 'Studio Kinds' }),
).pipe(
  Plugin.addModule({
    id: 'studio-node-types',
    activatesOn: IllustratorEvents.Start,
    provides: [CanvasCapabilities.NodeType],
    activate: () =>
      Effect.succeed(
        Object.entries(STUDIO_KINDS).map(([type, spec]) =>
          Capability.contribute(CanvasCapabilities.NodeType, { type, spec }),
        ),
      ),
  }),
  Plugin.make,
);

/** One element, centred on its own canvas. */
type Element = {
  type: string;
  width: number;
  height: number;
  label?: string;
  icon?: string;
  body?: string;
  footer?: string;
  data?: Record<string, unknown>;
};

const seedElement =
  (element: Element) =>
  (content: ContentMap, root: string): void => {
    const { type, width, height, label, icon, body, footer, data } = element;
    const id = elementId('demo', 'box');
    content[nodeKey(id)] = {
      kind: 'node',
      scene: root,
      dsl: { object: 'demo', element: 'box' },
      node: {
        type,
        id,
        z: 'a1',
        center: { x: width / 2, y: height / 2 },
        size: { width, height },
        ...(label !== undefined ? { label } : {}),
        ...(icon ? { icon: { type: icon } } : {}),
        ...(body !== undefined ? { body } : {}),
        ...(footer !== undefined ? { footer } : {}),
        data: data ?? {},
      },
    };
  };

/** A generated kind as the slide that places it configures it: its geometry is the sidecar's, not this story's. */
const fromSlide = (slideId: string, componentId: string, type: string): Element => {
  const model: StudioModel = studioSlide(slideId).model;
  const { label, data, width, height } = studioComponentData(model, componentId);
  return { type, width, height, ...(label !== undefined ? { label } : {}), data };
};

const decoratorsFor = (seed: (content: ContentMap, root: string) => void, name = 'kind') =>
  StoryHarness.decorators({
    types: [Drawing.Drawing, Drawing.Canvas, ...types],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make(), StudioKindsPlugin()],
    onInit: async ({ space }) => {
      const canvas = addTestCanvas(space.db, seed, { ...STUDIO_CANVAS, readonly: true });
      const drawing = space.db.add(Drawing.make({ name, canvas }));
      await space.db.flush();
      return [[Cell.article(drawing)]];
    },
  });

const decorators = (element: Element) => decoratorsFor(seedElement(element), element.type);

const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'plugins/plugin-canvas/experimental/Kinds',
  render: ModuleContainer.Root,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Every kind draws the element its own view is for, rather than the canvas's fallback box. */
const drawsAs =
  (testId: string): Story['play'] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 60_000 });
    await canvas.findByTestId(testId, undefined, { timeout: 30_000 });
    await expect(canvasElement.querySelectorAll(`[data-testid="${testId}"]`).length).toBe(1);
  };

/**
 * One composite, placed three times: a full card, the same definition with no body or footer (the title grows into
 * them, which is the deck's `simple` variant), and one at another size. Nothing about the shape is restated —
 * each placement supplies the bound fields and the box, and the composite does the rest.
 */
export const CardComposite: Story = {
  decorators: decoratorsFor((content, root) => {
    const place = (
      id: string,
      x: number,
      y: number,
      width: number,
      height: number,
      fields: Record<string, unknown>,
    ) => {
      const element = elementId(id, 'box');
      content[nodeKey(element)] = {
        kind: 'node',
        scene: root,
        dsl: { object: id, element: 'box' },
        node: {
          type: 'studio-card',
          id: element,
          z: 'a1',
          center: { x, y },
          size: { width, height },
          composite: STUDIO_CARD_COMPOSITE,
          ...fields,
        },
      };
    };
    const { width, height } = STUDIO_CARD_SIZE;
    place('full', width / 2, height / 2, width, height, {
      label: 'Calendar',
      icon: { type: 'ph--calendar-blank--regular' },
      body: 'Events and free/busy, read by the planner.',
      footer: 'events · free/busy',
    });
    // No body and no footer: both are `optional`, so they drop and the title grows into the space.
    place('simple', width / 2, height + 64, width, 64, {
      label: 'Email',
      icon: { type: 'ph--envelope-simple--regular' },
    });
    // The same definition at another size: the parts reflow rather than scaling.
    place('wide', width + 160, height / 2, width + 160, height, {
      label: 'Storage',
      icon: { type: 'ph--database--regular' },
      body: 'One definition, a third placement, a different box.',
      footer: 'blobs · cache',
    });
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('scene-view', undefined, { timeout: 60_000 });
    // Three placements of one composite, so three instances — and the labels each supplied.
    for (const label of ['Calendar', 'Email', 'Storage']) {
      await canvas.findByText(label, undefined, { timeout: 30_000 });
    }
  },
};

export const Card: Story = {
  decorators: decorators({
    type: 'card',
    width: 304,
    height: 64,
    label: 'Calendar',
    icon: 'ph--calendar-blank--regular',
    footer: 'events · free/busy',
    data: { variant: 'simple', tone: 'event' },
  }),
  play: drawsAs('card-node'),
};

export const Feed: Story = {
  decorators: decorators({
    type: 'feed-card',
    width: 304,
    height: 176,
    label: 'Research',
    icon: 'ph--binoculars--regular',
    body: 'Reads the space and writes what it finds.',
    footer: 'agent · subagent',
    data: { tone: 'accent', feed: 12, marks: [2, 5, 9] },
  }),
  play: drawsAs('feed-card-node'),
};

export const Chip: Story = {
  decorators: decorators({
    type: 'chip',
    width: 160,
    height: 40,
    label: 'Graph',
    icon: 'ph--graph--regular',
    data: { tone: 'file' },
  }),
  play: drawsAs('chip-node'),
};

export const Plank: Story = {
  decorators: decorators(fromSlide('hyperspace', 'plank-board', 'plank')),
  play: drawsAs('plank-node'),
};

export const AppFrame: Story = {
  decorators: decorators(fromSlide('composer', 'frame', 'app-frame')),
  play: drawsAs('app-frame-node'),
};

export const Substrate: Story = {
  decorators: decorators(fromSlide('hyperspace', 'substrate', 'substrate')),
  play: drawsAs('substrate-node'),
};

export const SpaceGraph: Story = {
  decorators: decorators(fromSlide('agents', 'space', 'space-graph')),
  play: drawsAs('graph-node'),
};
