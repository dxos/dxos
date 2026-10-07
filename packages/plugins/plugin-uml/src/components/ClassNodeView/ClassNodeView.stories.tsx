//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import {
  LinesField,
  SceneBuilder,
  SceneView,
  createMemoryStore,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
} from '@dxos/react-ui-canvas/scene';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { ClassNode } from '#types';

import { ClassNodeView } from './ClassNodeView.tsx';

// The canvas as plugin-canvas composes it once this plugin contributes the class type.
const nodes = createNodeRegistry(
  {
    ...defaultNodeTypes,
    [ClassNode.TYPE]: {
      ...ClassNode.spec,
      component: ClassNodeView,
      fields: { attributes: LinesField, methods: LinesField },
    },
  },
  defaultNodePrototypes,
);

const box = (x: number, y: number) => ({ x, y, width: 256, height: 256 });

/** A small class model: an employee is a person (inheritance) who works for an organization. */
const createClassTree = () =>
  SceneBuilder.scene('root', [
    SceneBuilder.node('class', 'person', box(-384, -320)).properties({
      name: 'Person',
      attributes: ['name: string'],
      methods: ['greet()'],
    }),
    SceneBuilder.node('class', 'employee', box(-384, 64)).properties({
      name: 'Employee',
      attributes: ['title: string'],
      methods: ['work()'],
    }),
    SceneBuilder.node('class', 'org', box(128, 64)).properties({
      name: 'Organization',
      attributes: ['name: string'],
      methods: ['hire(person)'],
    }),
    SceneBuilder.link('smart', 'employee', 'person').properties({ ends: { end: 'triangle' } }),
    SceneBuilder.link('smart', 'employee', 'org').properties({ ends: { start: 'circle', end: 'arrow' } }),
  ])
    .name('Classes')
    .build(nodes);

const DefaultStory = () => {
  const { store, root } = useMemo(() => {
    const tree = createClassTree();
    return { store: createMemoryStore(tree.scenes), root: tree.root };
  }, []);
  return (
    <SceneView.Root store={store} root={root} nodes={nodes}>
      <SceneView.Canvas />
      <SceneView.Actions />
      <SceneView.Palette />
      <SceneView.Properties />
    </SceneView.Root>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-uml/components/ClassNodeView',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

export const Default: StoryObj = {};
