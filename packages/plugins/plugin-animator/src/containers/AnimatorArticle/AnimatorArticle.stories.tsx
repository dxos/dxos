//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { createTimeline, setKey } from '@dxos/animation';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Animation, AnimatorCapabilities } from '#types';

import { dotsStage, makeDots } from '../../testing/index.ts';
import { AnimatorArticle } from './AnimatorArticle.tsx';

/** Two shots over a stage defined in the story: hand keys in the first, a declarative script in the second. */
const makeAnimation = () => {
  const dots = makeDots([
    { id: 'a', label: 'A', x: -20, y: 0, color: '#f97316' },
    { id: 'b', label: 'B', x: 0, y: 0, color: '#8b5cf6' },
    { id: 'c', label: 'C', x: 20, y: 0, color: '#06b6d4' },
  ]);
  let timeline = createTimeline(4);
  timeline = setKey(timeline, 'a', 'position', { t: 0, value: { x: -20, y: 0 } }, 'point');
  timeline = setKey(timeline, 'a', 'position', { t: 2, value: { x: -20, y: -30 }, easing: 'ease-in-out' }, 'point');
  timeline = setKey(timeline, 'a', 'position', { t: 4, value: { x: -20, y: 0 }, easing: 'ease-in-out' }, 'point');
  timeline = setKey(timeline, 'c', 'color', { t: 0, value: '#06b6d4' }, 'color');
  timeline = setKey(timeline, 'c', 'color', { t: 4, value: '#facc15' }, 'color');
  timeline = setKey(timeline, 'camera', 'zoom', { t: 0, value: 1 });
  timeline = setKey(timeline, 'camera', 'zoom', { t: 4, value: 1.5, easing: 'ease-out' });
  const first = { ...Animation.makeShot(Ref.make(dots), 4), timeline };
  const second: Animation.Shot = {
    ...Animation.makeShot(Ref.make(dots), 4),
    transition: { kind: 'fade', duration: 0.5 },
    script: [
      { duration: 1, hide: ['b'], caption: 'B leaves' },
      { duration: 1.5, layout: { kind: 'ring', targets: ['a', 'c'], params: { radius: 30 } }, caption: 'A and C ring' },
      { duration: 1, show: ['b'], caption: 'B returns' },
    ],
  };
  return Obj.make(Animation.Animation, { name: 'Dots', fps: 30, shots: [first, second] });
};

const DefaultStory = () => {
  const animation = useMemo(() => makeAnimation(), []);
  return <AnimatorArticle role='article' attendableId='story' subject={animation} />;
};

const meta = {
  title: 'plugins/plugin-animator/containers/AnimatorArticle',
  component: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({ capabilities: [Capability.contribute(AnimatorCapabilities.Stage, dotsStage)] }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
