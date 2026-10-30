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

/** Size axes read as their initial, as single-letter coordinates already do. */
const SHORT_LABELS: Record<string, string> = { width: 'w', height: 'h', depth: 'd' };

/** Whether the property is a struct its schema marks as a vector (see {@link VectorAnnotation}). */
export const isVectorType = (ast: SchemaAST.AST): boolean =>
  Option.getOrElse(VectorAnnotation.getFromAst(ast), () => false) &&
  SchemaEx.findNode(ast, SchemaAST.isObjects) !== undefined;

/**
 * The numeric axes of a vector struct, in schema order: a single-letter name labels itself, a size axis takes its
 * initial, and any other axis its title (else its name).
 */
export const getVectorAxes = (ast: SchemaAST.AST): VectorAxis[] => {
  const struct = SchemaEx.findNode(ast, SchemaAST.isObjects);
  if (!struct) {
    return [];
  }

  return getFormProperties(struct).flatMap((property) => {
    if (typeof property.name !== 'string' || property.type._tag !== 'Number') {
      return [];
    }
    const name = property.name;
    const title = SchemaEx.getAnnotation<string>(SchemaAST.TitleAnnotationId)(property.type);
    const label = name.length === 1 ? name : (SHORT_LABELS[name] ?? title ?? name);
    return [{ name, label, type: property.type }];
  });
};
