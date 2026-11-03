//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode } from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

import { SceneEditor } from '../editor/index.ts';
import { DOCUMENT_2D, DOCUMENT_3D, SceneEditorStory, SHOTS_2D, SHOTS_3D } from '../testing/index.ts';
import { CATALOGS_3D } from './config3d.tsx';

type Panel = 'navigation' | 'tools' | 'display' | 'camera' | 'actions' | 'timeline' | 'inspector';

const PANELS: Record<Exclude<Panel, 'inspector'>, ReactNode> = {
  navigation: <SceneEditor.Navigation />,
  tools: <SceneEditor.Tools />,
  display: <SceneEditor.Display />,
  camera: <SceneEditor.Camera />,
  actions: <SceneEditor.Actions />,
  timeline: <SceneEditor.Timeline />,
};

type StoryProps = {
  dim: Scene.Dimension;
  panel: Panel;
  /** The inspector panel docked beside the viewport (every section) or floating over it (Properties only). */
  docked?: boolean;
};

/** One floating panel over the viewport, or the inspector panel with every section, in either dimension. */
const DefaultStory = ({ dim, panel, docked = true }: StoryProps) => (
  <SceneEditorStory
    document={dim === '3d' ? DOCUMENT_3D : DOCUMENT_2D}
    docked={panel === 'inspector' && docked}
    select={dim === '3d' ? ['hub'] : ['a']}
    shots={panel === 'timeline' ? (dim === '3d' ? SHOTS_3D : SHOTS_2D) : undefined}
    timeline={panel === 'timeline'}
  >
    <SceneEditor.Viewport>{panel !== 'inspector' && PANELS[panel]}</SceneEditor.Viewport>
    {panel === 'inspector' && <SceneEditor.Inspector catalogs={dim === '3d' ? CATALOGS_3D : undefined} />}
  </SceneEditorStory>
);

const meta = {
  title: 'ui/react-ui-canvas-editor/editor/Panels',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    dim: { control: 'inline-radio', options: ['2d', '3d'] },
    panel: {
      control: 'select',
      options: ['navigation', 'tools', 'display', 'camera', 'actions', 'timeline', 'inspector'],
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { dim: '2d', panel: 'tools' } };

export const Tools2D: Story = { args: { dim: '2d', panel: 'tools' } };

export const Tools3D: Story = { args: { dim: '3d', panel: 'tools' } };

export const Display2D: Story = { args: { dim: '2d', panel: 'display' } };

export const Display3D: Story = { args: { dim: '3d', panel: 'display' } };

export const Camera2D: Story = { args: { dim: '2d', panel: 'camera' } };

export const Camera3D: Story = { args: { dim: '3d', panel: 'camera' } };

export const Actions2D: Story = { args: { dim: '2d', panel: 'actions' } };

export const Actions3D: Story = { args: { dim: '3d', panel: 'actions' } };

export const Timeline2D: Story = { args: { dim: '2d', panel: 'timeline' } };

export const Timeline3D: Story = { args: { dim: '3d', panel: 'timeline' } };

export const InspectorDocked2D: Story = { args: { dim: '2d', panel: 'inspector', docked: true } };

export const InspectorDocked3D: Story = { args: { dim: '3d', panel: 'inspector', docked: true } };

export const InspectorFloating2D: Story = { args: { dim: '2d', panel: 'inspector', docked: false } };

export const InspectorFloating3D: Story = { args: { dim: '3d', panel: 'inspector', docked: false } };
