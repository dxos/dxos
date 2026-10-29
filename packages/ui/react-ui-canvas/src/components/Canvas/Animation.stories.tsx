//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { ViewBuilder } from '../../builder/index.ts';
import { type Timeline, type View, createMemoryStore, createTimeline, setKey } from '../../model/index.ts';
import { Canvas } from './Canvas.tsx';

/** A node drawn on the scene itself, not inside an instance (which draws its composite's nodes under their own ids). */
const topLevel = (root: HTMLElement, id: string) =>
  [...(root.querySelector('[data-testid="scene-view"]')?.querySelectorAll(`[data-node-id="${id}"]`) ?? [])].find(
    (element) => !element.closest('[data-instance]'),
  );

/** Three linked shapes on a four-second loop: A grows and shrinks, then C does. */
const createTree = (keyed: boolean) => {
  const box = (x: number) => ({ x, y: -64, width: 128, height: 128 });
  const tree = ViewBuilder.view('scene:root', [
    ViewBuilder.rect('a', box(-320)).properties({ label: 'A', style: { hue: 'blue' } }),
    ViewBuilder.rect('b', box(-64)).properties({ label: 'B', style: { hue: 'amber' } }),
    ViewBuilder.rect('c', box(192)).properties({ label: 'C', style: { hue: 'green' } }),
    ViewBuilder.link('smart', 'a', 'b'),
    ViewBuilder.link('smart', 'b', 'c'),
  ])
    .name('Animation')
    .build();
  // A grows and shrinks over the first two seconds, then C over the last two; each holds its size the rest of the loop.
  const small = { width: 128, height: 128 };
  const large = { width: 224, height: 224 };
  const pulse = (target: string, start: number) => (timeline: Timeline) =>
    [start, start + 1, start + 2].reduce(
      (next, t, index) => setKey(next, target, 'size', { t, value: index === 1 ? large : small }),
      timeline,
    );
  const timeline = pulse('c', 2)(pulse('a', 0)(createTimeline(4)));
  const scenes = tree.views.map((scene): View =>
    scene.id === tree.root ? { ...scene, timeline: keyed ? timeline : createTimeline(4) } : scene,
  );
  return { scenes, root: tree.root };
};

type StoryArgs = {
  /** The shapes start keyed, so playback shows motion; off, the timeline is blank for keying from scratch. */
  keyed?: boolean;
};

const DefaultStory = ({ keyed = true }: StoryArgs) => {
  const { store, root } = useMemo(() => {
    const tree = createTree(keyed);
    return { store: createMemoryStore(tree.scenes, {}, { root: tree.root }), root: tree.root };
  }, [keyed]);
  // Docked: the objects inspector, which the story uses, never floats.
  return (
    <Canvas.Root store={store} root={root} inspectors='docked'>
      <Canvas.Viewport />
      <Canvas.Navigation />
      <Canvas.Actions />
      <Canvas.Tools />
      <Canvas.Timeline />
      <Canvas.Properties />
      <Canvas.Views />
      <Canvas.Layers />
      <Canvas.Objects />
    </Canvas.Root>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/components/Animation',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Test:
 * 1. Select all and Group (CmdG): one instance replaces the shapes and the Objects panel lists its group while selected.
 * 2. Scrub to the middle of the timeline and nudge the instance: the move becomes a key (a diamond on the track).
 * 3. Space plays from the start; the time advances.
 * 4. Selecting the group's row opens it in isolation (`Objects > Group 1`); Escape returns to the scene.
 */
export const Default: Story = {};

/** The steps above as a play test, from a blank timeline. */
export const Test: Story = {
  args: { keyed: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = await canvas.findByTestId('scene-view');
    await waitFor(() => expect(canvasElement.querySelector('[data-node-id="a"]')).not.toBeNull());

    // 1. Group the selection as an anonymous object.
    view.focus();
    await userEvent.keyboard('{Meta>}a{/Meta}');
    await userEvent.keyboard('{Meta>}g{/Meta}');
    await waitFor(() => expect(topLevel(canvasElement, 'a')).toBeUndefined());
    const instance = await waitFor(() => {
      const element = canvasElement.querySelector('[data-node-id^="instance-"]');
      if (!element) {
        throw new Error('No instance yet.');
      }
      return element;
    });
    await expect(within(await canvas.findByTestId('objects')).getByText('Group 1')).toBeInTheDocument();

    // 2. Scrub to 2 s and nudge: a key at the playhead.
    const track = await canvas.findByTestId('timeline-track');
    const rect = track.getBoundingClientRect();
    await fireEvent.pointerDown(track, { clientX: rect.left + rect.width / 2, clientY: rect.top + 4, pointerId: 1 });
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).toHaveTextContent('2.00'));
    view.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(canvas.getAllByTestId('timeline-key')).toHaveLength(1));
    await expect(instance).toBeInTheDocument();

    // 3. Space plays from wherever the playhead is.
    await userEvent.keyboard(' ');
    await waitFor(() => expect(canvas.getByTestId('timeline-play')).toHaveAccessibleName('Pause'));
    // Frames come slowly in a hidden or loaded runner, so the clock is given time to move.
    await waitFor(() => expect(canvas.getByTestId('timeline-time')).not.toHaveTextContent(/^2\.00/), {
      timeout: 5_000,
    });
    await userEvent.keyboard(' ');

    // 4. Isolation and back.
    await userEvent.click(within(await canvas.findByTestId('objects')).getByText('Group 1'));
    await waitFor(() => expect(topLevel(canvasElement, 'a')).toBeDefined());
    await expect(canvas.getByText('Objects')).toBeInTheDocument();
    view.focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(topLevel(canvasElement, 'a')).toBeUndefined());
    await expect(canvasElement.querySelector('[data-node-id^="instance-"]')).not.toBeNull();
  },
};
