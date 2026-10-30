//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';

import { VectorAnnotation } from '../../annotations.ts';
import { getFormProperties } from '../../util/index.ts';

/** One numeric axis of a vector struct. */
export type VectorAxis = {
  /** The property name, which is also the last segment of the axis's path. */
  name: string;
  /** The short label drawn beside the axis's input. */
  label: string;
  type: SchemaAST.AST;
};

/** Axes are lettered by position, whatever their property names (a size's width and height read x and y). */
const AXIS_LETTERS = ['x', 'y', 'z', 'w'] as const;

/** Whether the property is a struct its schema marks as a vector (see {@link VectorAnnotation}). */
export const isVectorType = (ast: SchemaAST.AST): boolean =>
  Option.getOrElse(VectorAnnotation.getFromAst(ast), () => false) &&
  SchemaEx.findNode(ast, SchemaAST.isObjects) !== undefined;

/**
 * The numeric axes of a vector struct, in schema order, lettered x, y, z by position.
 */
export const getVectorAxes = (ast: SchemaAST.AST): VectorAxis[] => {
  const struct = SchemaEx.findNode(ast, SchemaAST.isObjects);
  if (!struct) {
    return [];
  }

  return getFormProperties(struct)
    .filter((property) => typeof property.name === 'string' && property.type._tag === 'Number')
    .map((property, index) => ({
      name: String(property.name),
      label: AXIS_LETTERS[index] ?? String(property.name),
      type: property.type,
    }));
};
