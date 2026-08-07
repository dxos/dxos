//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';
import { SchemaAST, SchemaEx } from '@dxos/effect';

// Kept out of `FormLayout.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export type ResolvedLayoutField = {
  /** Resolved leaf AST node for the field. */
  type: SchemaAST.AST;
  /** Path segments (dotted names split on `.`). */
  segments: string[];
  /** Last path segment; used to derive the field label when there is no `title` annotation. */
  leafName: string;
  /** Resolved `title` annotation for the field, if any. */
  title?: string;
  /**
   * Set when the field resolves to a nested struct carrying a `LabelAnnotation` —
   * the type literal whose computed label should render in place of the struct's
   * sub-fields. Undefined for ordinary (non-auto-labelled) fields.
   */
  labelType?: SchemaAST.AST;
  /** Whether the resolved property is required (non-optional). */
  required: boolean;
};

/**
 * Walks a dotted path of property names through nested struct ASTs, returning the
 * leaf `PropertySignature` (or `undefined` if any segment is missing).
 */
const resolvePropertySignature = (ast: SchemaAST.AST, segments: string[]): SchemaAST.PropertySignature | undefined => {
  let node: SchemaAST.AST = ast;
  for (let index = 0; index < segments.length; index++) {
    const typeLiteral = SchemaEx.findNode(node, SchemaAST.isTypeLiteral);
    if (!typeLiteral) {
      return undefined;
    }
    const prop = SchemaAST.getPropertySignatures(typeLiteral).find(
      (p) => globalThis.String(p.name) === segments[index],
    );
    if (!prop) {
      return undefined;
    }
    if (index === segments.length - 1) {
      return prop;
    }
    node = prop.type;
  }

  return undefined;
};

/**
 * Resolves a (possibly dotted) layout field name against a schema.
 * - `origin.code` drills through nested structs to the leaf field.
 * - A name resolving to a nested struct with a `LabelAnnotation` is flagged via
 *   `labelType` so the layout can auto-convert it to a single read-only label.
 * Returns `undefined` when the name does not resolve to a property.
 */
export const resolveLayoutField = (schema: Schema.Schema<any>, name: string): ResolvedLayoutField | undefined => {
  const segments = name.split('.');
  const prop = resolvePropertySignature(schema.ast, segments);
  if (!prop) {
    return undefined;
  }

  // Normalized leaf type (optional unwrapped, refinements stripped, signature-level
  // annotations merged) — matches how `getProperties` feeds `FormField`.
  const { type: baseType } = SchemaEx.getBaseType(prop);
  const type =
    prop.annotations && Reflect.ownKeys(prop.annotations).length > 0
      ? ({ ...baseType, annotations: { ...baseType.annotations, ...prop.annotations } } as SchemaAST.AST)
      : baseType;

  const title = SchemaEx.getAnnotation<string>(SchemaAST.TitleAnnotationId)(type);

  // Label detection reads the *raw* property type: `SchemaEx.getBaseType`'s `encodedBoundAST`
  // strips annotations from non-keyword inner types (e.g. nested structs), which would
  // drop the `LabelAnnotation` we rely on here.
  const labelType = SchemaEx.findNode(prop.type, SchemaAST.isTypeLiteral);
  const labelled = labelType != null && Option.isSome(Annotation.LabelAnnotation.getFromAst(labelType));

  return {
    type,
    segments,
    leafName: segments[segments.length - 1],
    title,
    labelType: labelled ? labelType : undefined,
    required: !SchemaAST.isOptional(prop.type),
  };
};
