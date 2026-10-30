//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import {
  type Camera,
  type EditorDisplay,
  LinesField,
  SceneEditor,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
} from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { createConfig2D, kindNodeDef } from '@dxos/react-ui-scene';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { ClassNode } from '#types';

import { ClassNodeView } from './ClassNodeView.tsx';

// The 2D editor as plugin-canvas composes it once this plugin contributes the class kind.
const config = createConfig2D({
  nodes: createNodeRegistry(
    {
      ...defaultNodeTypes,
      [ClassNode.TYPE]: {
        ...kindNodeDef(ClassNode.TYPE, ClassNode.spec),
        component: ClassNodeView,
        fields: { attributes: LinesField, methods: LinesField },
      },
    },
    defaultNodePrototypes,
  ),
  kinds: ClassNode.kinds,
});

const AUTHORED_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

const classOf = (
  id: string,
  z: string,
  [x, y]: [number, number],
  label: string,
  attributes: string[],
  methods: string[],
) => ({
  ...ClassNode.make({ id, z, center: { x, y }, size: { width: 256, height: 256 } }),
  label,
  attributes,
  methods,
});

const linkOf = (
  id: string,
  z: string,
  source: string,
  target: string,
  ends: Record<string, string>,
): Scene.Element2D => ({
  id,
  type: 'link',
  z,
  source: { node: source },
  target: { node: target },
  props: { canvas: { type: 'smart', ends } },
});

/** A small class model: an employee is a person (inheritance) who works for an organization. */
const createClassDocument = (): Scene.SceneDocument => {
  const elements: Scene.Element2D[] = [
    classOf('person', 'a0', [-256, -192], 'Person', ['name: string'], ['greet()']),
    classOf('employee', 'a1', [-256, 192], 'Employee', ['title: string'], ['work()']),
    classOf('org', 'a2', [256, 192], 'Organization', ['name: string'], ['hire(person)']),
    linkOf('extends', 'a3', 'employee', 'person', { end: 'triangle' }),
    linkOf('works', 'a4', 'employee', 'org', { start: 'circle', end: 'arrow' }),
  ];
  return {
    scenes: [{ id: 'root', dim: '2d', layout: 'classes', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
    layouts: [
      {
        id: 'classes',
        dim: '2d',
        name: 'Classes',
        elements: Object.fromEntries(elements.map((element) => [element.id, element])),
      },
    ],
    models: [],
  };
};

const DefaultStory = () => {
  const [document, setDocument] = useState(createClassDocument);
  const handleIntent = useCallback(
    (layout: string, intent: LayoutIntent) =>
      setDocument((current) => ({
        ...current,
        layouts: current.layouts.map((record) => (record.id === layout ? applyIntent(record, intent) : record)),
      })),
    [],
  );
  const [display, setDisplay] = useState<EditorDisplay>({ theme: 'flat', grid: true, snap: true, guides: true });
  const handleDisplayChange = useCallback(
    (next: Partial<EditorDisplay>) => setDisplay((current) => ({ ...current, ...next })),
    [],
  );
  const [camera, setCamera] = useState<Camera>();
  const [docked, setDocked] = useState(false);
  const scene = useMemo(() => document.scenes[0].id, [document]);
  return (
    <SceneEditor.Root
      config={config}
      document={document}
      scene={scene}
      onIntent={handleIntent}
      display={display}
      onDisplayChange={handleDisplayChange}
      camera={camera}
      authoredCamera={AUTHORED_CAMERA}
      onCameraChange={setCamera}
      docked={docked}
      onDockedChange={setDocked}
    >
      <SceneEditor.Viewport>
        <SceneEditor.Tools />
        <SceneEditor.Actions />
        <SceneEditor.Camera />
        <SceneEditor.ContextMenu />
      </SceneEditor.Viewport>
      <SceneEditor.Inspector />
    </SceneEditor.Root>
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
