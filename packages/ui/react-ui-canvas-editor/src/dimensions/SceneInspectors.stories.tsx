//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { userEvent, within } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type Scene } from '@dxos/scene';

import {
  LayersSection,
  ObjectsSection,
  PropertiesSection,
  SceneEditor,
  StylesSection,
  ViewsSection,
} from '../editor/index.ts';
import { DOCUMENT_2D, DOCUMENT_3D, SceneEditorStory } from '../testing/index.ts';
import { CATALOGS_3D } from './config3d.tsx';

type Inspector = 'properties' | 'views' | 'objects' | 'layers' | 'styles';

type StoryProps = {
  dim: Scene.Dimension;
  inspector: Inspector;
};

/** One inspector section alone in the docked inspector panel, with an element selected, in either dimension. */
const DefaultStory = ({ dim, inspector }: StoryProps) => (
  <SceneEditorStory document={dim === '3d' ? DOCUMENT_3D : DOCUMENT_2D} docked select={dim === '3d' ? ['hub'] : ['a']}>
    <SceneEditor.Viewport />
    {inspector === 'properties' && <PropertiesSection />}
    {inspector === 'views' && <ViewsSection />}
    {inspector === 'objects' && <ObjectsSection />}
    {inspector === 'layers' && <LayersSection />}
    {inspector === 'styles' && <StylesSection catalogs={dim === '3d' ? CATALOGS_3D : undefined} />}
  </SceneEditorStory>
);

const meta = {
  title: 'ui/react-ui-canvas-editor/editor/Inspectors',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    dim: { control: 'inline-radio', options: ['2d', '3d'] },
    inspector: { control: 'select', options: ['properties', 'views', 'objects', 'layers', 'styles'] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Opens the section, which starts closed the first time it shows (all but Properties). */
const openSection =
  (id: Inspector): Story['play'] =>
  async ({ canvasElement }) => {
    const section = await within(canvasElement).findByTestId(`dock-section-${id}`);
    const trigger = within(section).getAllByRole('button')[0];
    if (trigger?.getAttribute('aria-expanded') === 'false') {
      await userEvent.click(trigger);
    }
  };

export const Default: Story = { args: { dim: '2d', inspector: 'properties' } };

export const Properties2D: Story = { args: { dim: '2d', inspector: 'properties' } };

export const Properties3D: Story = { args: { dim: '3d', inspector: 'properties' } };

export const Views2D: Story = { args: { dim: '2d', inspector: 'views' }, play: openSection('views') };

export const Views3D: Story = { args: { dim: '3d', inspector: 'views' }, play: openSection('views') };

export const Objects2D: Story = { args: { dim: '2d', inspector: 'objects' }, play: openSection('objects') };

export const Objects3D: Story = { args: { dim: '3d', inspector: 'objects' }, play: openSection('objects') };

export const Layers2D: Story = { args: { dim: '2d', inspector: 'layers' }, play: openSection('layers') };

export const Layers3D: Story = { args: { dim: '3d', inspector: 'layers' }, play: openSection('layers') };

export const Styles2D: Story = { args: { dim: '2d', inspector: 'styles' }, play: openSection('styles') };

export const Styles3D: Story = { args: { dim: '3d', inspector: 'styles' }, play: openSection('styles') };
