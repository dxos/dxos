//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { CanvasBoard } from '@dxos/react-ui-canvas-editor';
import { Point, Size } from '@dxos/react-ui-canvas/scene';
import { type MakeOptional } from '@dxos/util';

//
// Properties
//

export type PropertyKind = 'input' | 'output';

export const getProperties = (ast: SchemaAST.AST) =>
  SchemaAST.getPropertySignatures(ast).map(({ name }) => ({ name: name.toString() }));

export const createAnchorId = (kind: PropertyKind, property = kind === 'input' ? DEFAULT_INPUT : DEFAULT_OUTPUT) =>
  [kind, property].join('.');

export const parseAnchorId = (id: string): [PropertyKind | undefined, string] => {
  const parts = id.match(/(input|output)\.(.+)/);
  return parts ? (parts.slice(1) as any) : [undefined, id];
};

//
// Shapes
//

export type CreateShapeProps<S extends ComputeShape> = Omit<MakeOptional<S, 'id' | 'size'>, 'type' | 'node'>;

// The board's stored shape (a closed shape with a centre and size, every key mutable), so boards the editor wrote
// still decode.
export const ComputeShape = CanvasBoard.Shape.mapFields(
  Struct.assign({
    center: Point,
    size: Size.mapFields(Struct.map(Schema.mutableKey)),
  }),
)
  .mapFields(Struct.map(Schema.mutableKey))
  .mapFields(
    Struct.assign({
      // TODO(burdon): Rename computeNode?
      node: Schema.mutableKey(Schema.optional(Obj.ID.annotate({ description: 'Compute node id' }))),
    }),
  );

export type ComputeShape = Schema.Schema.Type<typeof ComputeShape>;

/** The shape's schema with the engine's z-order key, so it is a node schema. */
export const withZ = <Fields extends Schema.Struct.Fields>(shape: Schema.Struct<Fields>) =>
  shape.mapFields(Struct.assign({ z: Schema.String }));

export const createShape = <S extends ComputeShape>({ id, ...rest }: CreateShapeProps<S> & { type: string }): S => {
  return {
    id: id ?? Obj.ID.random(),
    ...rest,
  } as S;
};
