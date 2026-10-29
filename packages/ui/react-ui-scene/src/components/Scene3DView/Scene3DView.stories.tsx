//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Scene } from '@dxos/scene';

import { Scene3DView } from './Scene3DView.tsx';

const EXEMPLARS_3D = ['cube', 'cluster', 'encapsulated', 'hierarchy', 'solid'] as const;
const THEMES = ['cad', 'presentation'] as const;
const CAMERAS = ['iso', 'front', 'close', 'wide'] as const;

type StoryProps = {
  exemplar: (typeof EXEMPLARS_3D)[number];
  theme: (typeof THEMES)[number];
  camera: (typeof CAMERAS)[number];
};

/** Variations on the scene's own camera: as written, straight on and orthographic, nearer, and a wide lens. */
const cameraFor = (base: Scene.Camera3D, preset: StoryProps['camera']): Scene.Camera3D => {
  switch (preset) {
    case 'front':
      return { ...base, yaw: 0, pitch: 0, projection: 'orthographic' };
    case 'close':
      return { ...base, distance: base.distance * 0.55 };
    case 'wide':
      return { ...base, fov: 1.2, distance: base.distance * 0.7, pitch: 50 };
    default:
      return base;
  }
};

const DefaultStory = ({ exemplar, theme, camera }: StoryProps) => {
  const document = useMemo(() => Dsl.readScenes(EXEMPLARS[exemplar]).document, [exemplar]);
  const root = document.scenes[0];
  const view = useMemo(() => (root?.dim === '3d' ? cameraFor(root.camera, camera) : undefined), [root, camera]);
  return <Scene3DView document={document} theme={theme} camera={view} />;
};

const meta = {
  title: 'ui/react-ui-scene/components/Scene3DView',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    exemplar: { control: 'select', options: EXEMPLARS_3D },
    theme: { control: 'radio', options: THEMES },
    camera: { control: 'select', options: CAMERAS },
  },
  args: { exemplar: 'encapsulated', theme: 'presentation', camera: 'iso' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
