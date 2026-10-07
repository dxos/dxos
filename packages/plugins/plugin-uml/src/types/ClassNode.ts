//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type CreateProps, type NodeDefSpec, type NodeType, nodeBase } from '@dxos/react-ui-canvas/scene';

/** The canvas node type a UML class is stored as. */
export const TYPE: NodeType = 'class';

/** UML class box: a name compartment over attribute and method compartments. */
export const ClassNode = Schema.Struct({
  type: Schema.Literal('class'),
  ...nodeBase,
  name: Schema.String,
  attributes: Schema.Array(Schema.String),
  methods: Schema.Array(Schema.String),
});
export type ClassNode = Schema.Schema.Type<typeof ClassNode>;

export const isClassNode = (node: { type: string }): node is ClassNode => node.type === TYPE;

/** A new class with placeholder members, so the compartments read as a class before it is edited. */
export const make = ({ id, z, center, size }: CreateProps): ClassNode => ({
  type: 'class',
  id,
  z,
  center,
  size,
  name: 'Class',
  attributes: ['id: string'],
  methods: ['save(): void'],
});

/** Everything about the type except its view, which the capability adds (keeping React out of this module). */
export const spec: NodeDefSpec = {
  name: 'Class',
  icon: 'ph--rows--regular',
  key: 'C',
  schema: ClassNode,
  create: make,
  defaultSize: { width: 2, height: 2 },
  resizable: true,
  minSize: { width: 128, height: 96 },
  parts: [{ field: 'name' }, { field: 'attributes', lines: true }, { field: 'methods', lines: true }],
};
