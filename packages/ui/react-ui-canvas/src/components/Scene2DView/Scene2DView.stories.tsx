//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

import { camera2DTo3D, liftScene } from '../../lift/index.ts';
import { Scene3DView } from '../../three/index.ts';
import { Scene2DView } from './Scene2DView.tsx';

const EXEMPLARS_2D = ['square', 'links', 'subscene'] as const;
const THEMES = ['flat', 'outline', 'glass', 'classic'] as const;
const CAMERAS = ['fit', 'close', 'tilted'] as const;
const RENDERERS = ['dom', '3d'] as const;

type StoryProps = {
  exemplar: (typeof EXEMPLARS_2D)[number];
  theme: (typeof THEMES)[number];
  camera: (typeof CAMERAS)[number];
  renderer: (typeof RENDERERS)[number];
};

/** The 2D camera seen from above, tilted for a perspective view, or straight down. */
const camera3dFor = (camera: Scene.Camera2D, preset: StoryProps['camera']): Scene.Camera3D => {
  const top = camera2DTo3D(camera, { width: 800, height: 600 });
  return preset === 'tilted'
    ? { ...top, yaw: -25, pitch: 35, distance: top.distance * 1.4, projection: 'perspective' }
    : preset === 'close'
      ? { ...top, distance: top.distance / 2 }
      : top;
};

const DefaultStory = ({ exemplar, theme, camera, renderer }: StoryProps) => {
  const document = useMemo(() => Dsl.readScenes(EXEMPLARS[exemplar]).document, [exemplar]);
  const root = document.scenes[0];
  const sceneCamera = root?.dim === '2d' ? root.camera : undefined;
  const lifted = useMemo(() => (renderer === '3d' ? liftScene(document) : undefined), [renderer, document]);
  // The 3D renderer draws the scene lifted onto the ground plane (`/3d`), which the 2D view does not load.
  return lifted ? (
    <Scene3DView document={lifted} camera={sceneCamera ? camera3dFor(sceneCamera, camera) : undefined} />
  ) : (
    <Scene2DView
      document={document}
      theme={theme}
      camera={camera === 'close' && sceneCamera ? { ...sceneCamera, zoom: sceneCamera.zoom * 2 } : 'fit'}
    />
  );
};

const meta = {
  title: 'ui/react-ui-canvas/components/Scene2DView',
  component: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
  argTypes: {
    exemplar: { control: 'select', options: EXEMPLARS_2D },
    theme: { control: 'select', options: THEMES },
    camera: { control: 'radio', options: CAMERAS },
    renderer: { control: 'radio', options: RENDERERS },
  },
  args: { exemplar: 'links', theme: 'flat', camera: 'fit', renderer: 'dom' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
