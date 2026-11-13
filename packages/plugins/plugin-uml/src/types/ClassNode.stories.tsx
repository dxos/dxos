//
// Copyright 2026 DXOS.org
//

//
// The UML class on the canvas. It is a composite object declared in the scene DSL (`template.ts`), not a shape a
// React view paints: the canvas places an Instance of the class template and binds each compartment to the class's
// own field, so the name, the attributes and the methods stay typed on the shape while the composite says how they
// are laid out. Each compartment is a part — selected, moved, restyled and edited in place — and the Views tree
// expands a class into them.
//
// This is the story the kind had none of while it was a view: it runs the plugin's own kind through the shared
// editor by handing the harness a node registry with `class` in it, which is what the host does with a plugin's
// `NodeType` contributions.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import {
  type RenderList2D,
  compileTemplate,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  fromRenderLists2D,
  isCompiled,
  kindNodeDef,
  templateCompositeId,
} from '@dxos/react-ui-canvas';
import { FullEditor, SceneEditorStory } from '@dxos/react-ui-canvas-editor/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type NodeBase, type PlacedComposite, type Scene } from '@dxos/scene';

import { ClassNode } from '#types';

import { classNodeSpec } from '../capabilities/class-node-type.ts';
import { SIZE, TEMPLATE } from './template.ts';

/** The editor with the plugin's kind in it, as the host builds the registry from its contributions. */
const NODES = createNodeRegistry(
  { ...defaultNodeTypes, [ClassNode.TYPE]: kindNodeDef(ClassNode.TYPE, classNodeSpec) },
  defaultNodePrototypes,
);

const COMPOSITE = templateCompositeId(ClassNode.TYPE);

const compiled = compileTemplate(TEMPLATE, COMPOSITE);
if (!isCompiled(compiled)) {
  throw new Error(`The class template does not compile: ${compiled.problems.join(' ')}`);
}
const CLASS: RenderList2D = compiled.composite;

/** A class as the tool makes one: the engine's node, its own typed fields, and the Object it draws. */
type Class = NodeBase & ClassNode.ClassFields & Pick<PlacedComposite, 'composite' | 'overrides'>;

const classOf = (
  id: string,
  z: string,
  [x, y]: [number, number],
  label: string,
  attributes: readonly string[],
  methods: readonly string[],
  size = SIZE,
): Class => ({
  type: ClassNode.TYPE,
  id,
  z,
  center: { x, y },
  size,
  composite: COMPOSITE,
  label,
  data: { attributes, methods },
});

/**
 * Three classes of the one Object: the same definition at its authored size, with longer compartments, and taller.
 * The name keeps the top and the methods the floor, so a class resized taller grows its attribute list rather than
 * stretching its name.
 */
const BOARD: RenderList2D = {
  id: 'board',
  name: 'Board',
  links: {},
  nodes: Object.fromEntries(
    [
      classOf('account', 'a0', [-288, 0], 'Account', ['id: string', 'balance: number'], ['credit(amount): void']),
      classOf(
        'ledger',
        'a1',
        [0, 24],
        'Ledger',
        ['id: string', 'entries: Entry[]', 'opened: Date'],
        ['post(entry): void', 'close(): void'],
        { width: SIZE.width, height: SIZE.height + 48 },
      ),
      classOf('entry', 'a2', [288, 0], 'Entry', ['amount: number'], ['reverse(): Entry']),
    ].map((node) => [node.id, node]),
  ),
};

const DOCUMENT: Scene.SceneDocument = fromRenderLists2D([BOARD, CLASS], { root: 'board' });

const DefaultStory = () => (
  <SceneEditorStory document={DOCUMENT} nodes={NODES} docked>
    <FullEditor dim='2d' />
  </SceneEditorStory>
);

const meta: Meta = {
  title: 'plugins/plugin-uml/ClassNode',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

/** Each class expands in the Views tree into its three compartments, and each is edited in place. */
export const Default: StoryObj = {};
