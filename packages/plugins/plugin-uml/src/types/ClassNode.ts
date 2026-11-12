//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type { CreateProps } from '@dxos/react-ui-canvas';
import { type ElementKindSpec, kindRegistry } from '@dxos/react-ui-canvas';
import { type KindRegistry, Scene } from '@dxos/scene';

import { SIZE, TEMPLATE } from './template.ts';

/** The element type a UML class is stored as. */
export const TYPE = 'class';

/** A class's own fields: its name (in the base's `label`, so it still reads by name where the kind is unknown). */
const classFields = {
  label: Schema.String,
  attributes: Schema.Array(Schema.String),
  methods: Schema.Array(Schema.String),
};

/** A class's own fields, which its element and the canvas engine's node both carry. */
export type ClassFields = Schema.Struct.Type<typeof classFields>;

/** UML class box, an element kind (decision 13): a name compartment over attribute and method compartments. */
export const ClassNode = Schema.Struct({ ...Scene.Element2D.fields, type: Schema.Literal(TYPE), ...classFields });
export type ClassNode = Schema.Schema.Type<typeof ClassNode>;

/** Narrows an element, or the canvas node drawing one, to a class. */
export const isClassNode = <T extends { readonly type?: string }>(
  node: T,
): node is T & { type: 'class' } & ClassFields => node.type === TYPE;

/**
 * A new class with placeholder members, so the compartments read as a class before it is edited. It is an Instance of
 * the class template: the typed fields stay on the element and the composite's bound parts draw them.
 */
export const make = ({ id, z, center, size }: CreateProps): ClassNode => ({
  type: TYPE,
  id,
  z,
  center,
  size,
  label: 'Class',
  attributes: ['id: string'],
  methods: ['save(): void'],
});

/**
 * The kind: a composite object declared in the DSL (`template`), not a shape a React view paints. The canvas draws an
 * Instance of it and binds each compartment to the class's own field, so the compartments are edited in place and the
 * data stays typed.
 */
export const spec: ElementKindSpec = {
  name: 'Class',
  icon: 'ph--rows--regular',
  key: 'C',
  schema: ClassNode,
  create: make,
  template: TEMPLATE,
  defaultSize: { width: 2, height: 2 },
  resizable: true,
  minSize: { width: SIZE.width / 2, height: SIZE.height / 2 },
  parts: [{ field: 'label' }, { field: 'attributes', lines: true }, { field: 'methods', lines: true }],
};

/** Validates a stored class element's own fields. */
export const kinds: KindRegistry = kindRegistry({ [TYPE]: spec });
