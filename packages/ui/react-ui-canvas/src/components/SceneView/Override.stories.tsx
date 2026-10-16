//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/reactivity/Atom';
import React, { useEffect, useMemo } from 'react';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { useRegistry } from '../../hooks/index.ts';
import { type SceneOverrides, createOverrideStore } from '../../model/overrides.ts';
import { createMemoryStore } from '../../model/store.ts';
import { type Point } from '../../model/types.ts';
import { createNetworkTree } from '../../utils/testing.ts';
import { SceneView } from './SceneView.tsx';

const NETWORK = createNetworkTree();
const SCENES = Object.fromEntries(NETWORK.scenes.map((scene) => [scene.id, scene]));
const PHONE = SCENES['net:root'].nodes['net:phone'].center;
const OFFICE = SCENES['net:root'].nodes['net:office'].center;

/** Seconds since the story mounted, ticked once a frame: the only input every override derives from. */
const useClock = (time: Atom.Writable<number>) => {
  const registry = useRegistry();
  useEffect(() => {
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      registry.set(time, (now - start) / 1000);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [registry, time]);
};

/** A packet travelling from the phone to the office once a second, drawn in the overlay rather than as a node. */
const Packet = ({ time }: { time: Atom.Atom<number> }) => {
  const t = useAtomValue(time) % 1;
  const at: Point = { x: PHONE.x + (OFFICE.x - PHONE.x) * t, y: PHONE.y + (OFFICE.y - PHONE.y) * t };
  return (
    <svg className='absolute overflow-visible' width={1} height={1} data-testid='packet'>
      <circle cx={at.x} cy={at.y} r={8} className='fill-focus' />
    </svg>
  );
};

/**
 * The stored network, read-only, with overrides derived from a clock: the phone bobs, the printer inside the office
 * changes colour, and the cloud blinks out every fourth second. Nothing is written to the store.
 */
const DefaultStory = () => {
  const time = useMemo(() => Atom.make(0), []);
  const store = useMemo(() => {
    const base = createMemoryStore(NETWORK.scenes);
    const overrides = Atom.make((get): SceneOverrides => {
      const t = get(time);
      return {
        'net:root': {
          nodes: {
            'net:phone': { center: { x: PHONE.x, y: PHONE.y + Math.sin(t * 2) * 32 } },
            'net:cloud': { hidden: Math.floor(t) % 4 === 3 },
          },
        },
        'net:office': {
          nodes: { 'net:printer': { style: { hue: Math.floor(t) % 2 === 0 ? 'green' : 'red' } } },
        },
      };
    });
    return createOverrideStore(base, overrides);
  }, [time]);
  useClock(time);

  return (
    <SceneView.Root store={store} root={NETWORK.root} readonly>
      <SceneView.Canvas overlay={<Packet time={time} />} />
      <SceneView.Navigation />
    </SceneView.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-canvas/SceneView/Override',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...uiTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The overrides move a node on screen while the stored drawing keeps its position. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const phone = () => canvasElement.querySelector<HTMLElement>('[data-node-id="net:phone"]');
    const top = () => phone()?.getBoundingClientRect().top;

    // 1. The phone is drawn and the packet travels in the overlay.
    await waitFor(() => expect(phone()).not.toBeNull());
    await expect(canvasElement.querySelector('[data-testid="packet"]')).not.toBeNull();

    // 2. The phone moves on screen from frame to frame.
    const first = top();
    await waitFor(() => expect(top()).not.toBe(first), { timeout: 2000 });
  },
};
