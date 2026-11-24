//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { DSL } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

import { ViewBuilder } from '../../builder/index.ts';
import { camera2DTo3D, liftScene } from '../../lift/index.ts';
import { createThemeRegistry } from '../../model/index.ts';
import { Scene3DView } from '../../three/index.ts';
import { fromRenderLists2D } from '../../viewport2d/index.ts';
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
  const document = useMemo(() => DSL.readScenes(EXEMPLARS[exemplar]).document, [exemplar]);
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

/** A theme that defines two colours and a typeface of its own, over the flat look. */
const BRAND_THEMES = createThemeRegistry({
  themes: {
    brand: {
      id: 'brand',
      name: 'Brand',
      styleSet: 'flat',
      background: 'dots',
      colors: { accent: 'violet/1', brand: '#1e90ff' },
      fonts: { display: 'Georgia, serif' },
    },
  },
});

const cell = (x: number, y: number, width = 4, height = 2) => ({
  x: x * 64,
  y: y * 64,
  width: width * 64,
  height: height * 64,
});

const createSlots = () =>
  ViewBuilder.view('root', [
    ViewBuilder.rect('hue', cell(0, 0)).properties({ label: 'blue/1', overrides: { color: 'blue/1' } }),
    ViewBuilder.rect('accent', cell(5, 0)).properties({ label: 'accent', overrides: { color: 'accent' } }),
    ViewBuilder.rect('brand', cell(10, 0)).properties({ label: 'brand', overrides: { color: 'brand' } }),
    ViewBuilder.rect('brand-light', cell(15, 0)).properties({ label: 'brand/3', overrides: { color: 'brand/3' } }),
    ViewBuilder.rect('literal', cell(0, 3)).properties({ label: '#e11d48', overrides: { color: '#e11d48' } }),
    ViewBuilder.rect('literal-outline', cell(5, 3)).properties({
      label: 'fill none',
      overrides: { color: '#e11d48', fill: 'none', stroke: 'dashed' },
    }),
    ViewBuilder.rect('text', cell(10, 3)).properties({ label: 'text brand', overrides: { textColor: 'brand' } }),
    ViewBuilder.rect('mono', cell(0, 6)).properties({ label: 'font mono', overrides: { font: 'mono' } }),
    ViewBuilder.rect('display', cell(5, 6)).properties({ label: 'font display', overrides: { font: 'display' } }),
    ViewBuilder.rect('body', cell(10, 6)).properties({ label: 'font body' }),
    ViewBuilder.link('smart', 'hue', 'accent')
      .id('named')
      .properties({ overrides: { color: 'accent' }, head: 'arrow' }),
    ViewBuilder.link('smart', 'literal', 'literal-outline')
      .id('literal-link')
      .properties({ overrides: { color: '#e11d48' }, head: 'arrow' }),
  ]).build();

const SlotsStory = () => {
  const document = useMemo(() => {
    const tree = createSlots();
    return fromRenderLists2D(tree.views, { root: tree.root });
  }, []);
  return <Scene2DView document={document} theme='brand' themes={BRAND_THEMES} />;
};

/**
 * A style names a colour and a typeface, and the theme says what each draws as.
 *
 * Test:
 * 1. The top row is a hue at a tone, a colour the theme names (`accent`, violet), one it names as a literal
 *    (`brand`, a blue no palette has), and that literal at the lightest tone.
 * 2. The middle row is a literal colour stated on the shape, the same with no fill and a dashed stroke, and a shape
 *    whose text alone takes the theme's `brand`.
 * 3. The bottom row sets its label in the theme's `mono` slot, in a slot only this theme defines (`display`, a serif),
 *    and in the body face.
 * 4. The upper link is drawn in the theme's `accent`, and the lower one in the literal.
 */
export const ThemeSlots: Story = { render: () => <SlotsStory /> };
