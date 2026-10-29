//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';

import { Scene2DView } from './Scene2DView.tsx';

const EXEMPLARS_2D = ['square', 'links', 'subscene'] as const;
const THEMES = ['flat', 'outline', 'glass', 'classic'] as const;
const CAMERAS = ['fit', 'close'] as const;

type StoryProps = {
  exemplar: (typeof EXEMPLARS_2D)[number];
  theme: (typeof THEMES)[number];
  camera: (typeof CAMERAS)[number];
};

const DefaultStory = ({ exemplar, theme, camera }: StoryProps) => {
  const document = useMemo(() => Dsl.readScenes(EXEMPLARS[exemplar]).document, [exemplar]);
  const root = document.scenes[0];
  const sceneCamera = root?.dim === '2d' ? root.camera : undefined;
  return (
    <Scene2DView
      document={document}
      theme={theme}
      camera={camera === 'close' && sceneCamera ? { ...sceneCamera, zoom: sceneCamera.zoom * 2 } : 'fit'}
    />
  );
};

const meta = {
  title: 'ui/react-ui-scene/components/Scene2DView',
  component: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
  argTypes: {
    exemplar: { control: 'select', options: EXEMPLARS_2D },
    theme: { control: 'select', options: THEMES },
    camera: { control: 'radio', options: CAMERAS },
  },
  args: { exemplar: 'links', theme: 'flat', camera: 'fit' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
