//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Profiler } from 'react';
import { expect, waitFor } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

import { SceneEditor } from '../editor/index.ts';
import {
  CONSTRAINED_2D,
  DOCUMENT_2D,
  DOCUMENT_3D,
  DYNAMIC_2D,
  FullEditor,
  LATTICE_2D,
  NESTED_2D,
  NESTED_3D,
  NESTED_DEEP_2D,
  SceneEditorStory,
} from '../testing/index.ts';

type StoryProps = {
  dim: Scene.Dimension;
  /** Only an article edits; a card draws the picture. */
  role?: 'article' | 'card';
  docked?: boolean;
  /** A 2D layout in a mode of its own. */
  mode?: 'lattice' | 'dynamic' | 'constrained';
  /** Frames to drill into: one level, or two (2D only). */
  nested?: 'simple' | 'deep';
};

const MODE_DOCUMENTS = { lattice: LATTICE_2D, dynamic: DYNAMIC_2D, constrained: CONSTRAINED_2D };

const documentOf = (dim: Scene.Dimension, mode: StoryProps['mode'], nested: StoryProps['nested']) =>
  nested
    ? dim === '3d'
      ? NESTED_3D
      : nested === 'deep'
        ? NESTED_DEEP_2D
        : NESTED_2D
    : dim === '3d'
      ? DOCUMENT_3D
      : mode
        ? MODE_DOCUMENTS[mode]
        : DOCUMENT_2D;

const DefaultStory = ({ dim, role = 'article', docked = true, mode, nested }: StoryProps) => (
  <SceneEditorStory document={documentOf(dim, mode, nested)} role={role} docked={docked}>
    <FullEditor dim={dim} />
  </SceneEditorStory>
);

const meta = {
  title: 'ui/react-ui-canvas-editor/editor/SceneEditor',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    dim: { control: 'inline-radio', options: ['2d', '3d'] },
    role: { control: 'inline-radio', options: ['article', 'card'] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { dim: '2d' } };

export const Editor2D: Story = { args: { dim: '2d' } };

export const Editor3D: Story = { args: { dim: '3d' } };

export const Card2D: Story = { args: { dim: '2d', role: 'card' } };

export const Card3D: Story = { args: { dim: '3d', role: 'card' } };

/**
 * Test:
 * 1. Drag A part of a cell: it lands on whole cells when released; the guides show the cells.
 * 2. Drag A onto B: the move is refused and A is drawn back where it was.
 * 3. Turn snapping off in the display panel: shapes move freely; back on, the next move snaps.
 */
export const Lattice2D: Story = { args: { dim: '2d', mode: 'lattice' } };

/**
 * Test:
 * 1. Drag Leaf anywhere: it stays where it is dropped (pinned).
 * 2. Delete Right: the unpinned shapes are re-placed in rows along the links; Leaf stays put.
 */
export const Dynamic2D: Story = { args: { dim: '2d', mode: 'dynamic' } };

/**
 * Test:
 * 1. Drag C to the right of D: it is re-related to D (east, aligned) and every shape is re-placed on the grid.
 * 2. Undo: C and the constraints go back together; redo moves both again.
 * 3. Delete A: its constraints go with it and the rest are re-placed.
 */
export const Constrained2D: Story = { args: { dim: '2d', mode: 'constrained' } };

/**
 * Test:
 * 1. Double-click the frame C: the view zooms into it and the breadcrumbs (top left) read `root › C`.
 * 2. Escape, Up or the root crumb drills back out to the root.
 * 3. Zoom in on C until it fills the view: it drills in on its own; zoom well out again and it drills back out.
 * 4. C draws D → E scaled to fill the frame, not small in its top-left corner.
 */
export const Nested2D: Story = { args: { dim: '2d', nested: 'simple', docked: false } };

/**
 * Test:
 * 1. Double-click B, then E inside it: the breadcrumbs read `root › B › E`.
 * 2. The B crumb drills out one level; the root crumb drills out to the root.
 */
export const NestedDeep2D: Story = { args: { dim: '2d', nested: 'deep', docked: false } };

/**
 * Test:
 * 1. Double-click the glass shell (Team): its parts open with the rest faded, and the breadcrumbs read
 *    `Encapsulated › cluster`.
 * 2. Escape or the root crumb goes back out.
 */
export const Nested3D: Story = { args: { dim: '3d', nested: 'simple', docked: false } };

/** Commits of the floating panels and the inspector, counted by the profilers round them. */
const panelCommits = { count: 0 };

const countCommit = () => {
  panelCommits.count++;
};

/** The editor with its panels and inspector under profilers, which count every commit they make. */
const PanStory = ({ dim }: Pick<StoryProps, 'dim'>) => (
  <SceneEditorStory document={dim === '3d' ? DOCUMENT_3D : DOCUMENT_2D} docked={false}>
    <SceneEditor.Viewport>
      <Profiler id='panels' onRender={countCommit}>
        <SceneEditor.Navigation />
        <SceneEditor.Tools />
        <SceneEditor.Actions />
        <SceneEditor.Camera />
        <SceneEditor.Display />
      </Profiler>
    </SceneEditor.Viewport>
    <Profiler id='inspector' onRender={countCommit}>
      <SceneEditor.Inspector />
    </Profiler>
  </SceneEditorStory>
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** What the scene draws under, read before and after the pan to show it moved: 2D's transform, 3D's pixels. */
const viewOf = (canvasElement: HTMLElement): string =>
  canvasElement.querySelector<HTMLElement>('[data-testid=scene-view] [style*="scale("]')?.style.transform ??
  canvasElement.querySelector('canvas')?.toDataURL() ??
  '';

/** Pans with twenty shift-scrolls over the scene, then waits past the camera's settle; no panel commits meanwhile. */
const panRendersNoPanels = async (canvasElement: HTMLElement, selector: string) => {
  const target = await waitFor(
    () => {
      const element = canvasElement.querySelector(selector);
      if (!element) {
        throw new Error(`No ${selector} yet.`);
      }
      return element;
    },
    { timeout: 10_000 },
  );
  // The panels' own mount and the viewport's first fit settle first.
  await sleep(1_000);
  const before = panelCommits.count;
  const view = viewOf(canvasElement);
  for (let step = 0; step < 20; step++) {
    target.dispatchEvent(
      new WheelEvent('wheel', { deltaX: 8, deltaY: 6, shiftKey: true, bubbles: true, cancelable: true }),
    );
    await sleep(16);
  }
  // Past the camera's settle, so the host stores the camera the pan left.
  await sleep(800);
  await expect(viewOf(canvasElement)).not.toBe(view);
  await expect(panelCommits.count - before).toBe(0);
};

/**
 * Test:
 * 1. Shift-scroll over the scene: it pans.
 * 2. No panel or inspector section re-renders while it pans, or when the host stores the camera after (§13.2 phase 3).
 */
export const PanRenders2D: StoryObj<typeof PanStory> = {
  render: PanStory,
  args: { dim: '2d' },
  play: async ({ canvasElement }) => panRendersNoPanels(canvasElement, '[data-testid=scene-view]'),
};

/**
 * Test:
 * 1. Shift-scroll over the scene: the camera pans.
 * 2. No panel or inspector section re-renders while it pans, or when the host stores the camera after.
 */
export const PanRenders3D: StoryObj<typeof PanStory> = {
  render: PanStory,
  args: { dim: '3d' },
  play: async ({ canvasElement }) => panRendersNoPanels(canvasElement, 'canvas'),
};
