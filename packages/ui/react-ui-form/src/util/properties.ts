//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import { Annotation } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaAST, SchemaEx } from '@dxos/effect';

/** The property's type with an optional `T | undefined` union unwrapped to its inner `T`. */
const unwrapOptional = (prop: SchemaAST.PropertySignature): SchemaAST.AST => {
  if (!SchemaAST.isOptional(prop.type) || !SchemaAST.isUnion(prop.type)) {
    return prop.type;
  }
  // Drop the `undefined` member, preserving the remaining union (don't collapse `A | B | undefined` to `A`).
  const defined = prop.type.types.filter((type) => type._tag !== 'Undefined');
  if (defined.length === 0) {
    return prop.type;
  }
  return defined.length === 1
    ? defined[0]
    : new SchemaAST.Union(defined, prop.type.mode, prop.type.annotations, prop.type.checks);
};

/**
 * Discriminator values that open a root discriminated union on its first member.
 *
 * A union root with no discriminator value renders as a lone select and nothing else — no member's
 * fields, and no way to submit — so the form seeds the first member rather than presenting a dead
 * form. Member order is therefore the declaration order of `Schema.Union`: put the common case first.
 */
export const getDiscriminatorDefaults = (ast: SchemaAST.AST | undefined): Record<string, unknown> => {
  if (!ast || !SchemaEx.isDiscriminatedUnion(ast) || !SchemaAST.isUnion(ast)) {
    return {};
  }

  const discriminators = new Set(SchemaEx.getDiscriminatingProps(ast) ?? []);
  const [first] = ast.types;
  if (!first || discriminators.size === 0) {
    return {};
  }

  return Object.fromEntries(
    SchemaAST.getPropertySignatures(first)
      .filter((prop) => discriminators.has(prop.name.toString()) && SchemaAST.isLiteral(prop.type))
      .map((prop) => [prop.name.toString(), (prop.type as SchemaAST.Literal).literal]),
  );
};

/**
 * Resolve the properties to render for a field set's *root* schema, given the current form values.
 *
 * A top-level discriminated union is rendered flat: the fields of the member selected by the current
 * discriminator value, with the discriminator field keeping the union-wide set of literals so it stays
 * switchable. (`SchemaAST.getPropertySignatures` on a union returns only the common discriminator, so a
 * union root would otherwise render just that one field.) Non-union roots are unchanged. Nested unions are
 * unaffected — those are expanded per-field by `FormField`, which passes a single-member type literal here.
 */
export const getRootFormProperties = (
  ast: SchemaAST.AST,
  values: AnyProperties | undefined,
): SchemaEx.SchemaProperty[] => {
  if (!SchemaEx.isDiscriminatedUnion(ast)) {
    return getFormProperties(ast);
  }

  const activeType = SchemaEx.getDiscriminatedType(ast, values ?? {});
  if (!activeType) {
    return getFormProperties(ast);
  }
  const activeProps = getFormProperties(activeType);

  const discriminators = new Set((SchemaEx.getDiscriminatingProps(ast) ?? []).map((name) => name.toString()));
  if (discriminators.size === 0) {
    return activeProps;
  }
  // The matched member types its discriminator as a single literal; swap in the union-wide literal so the
  // field renders as a full select rather than a fixed value.
  const fullType = SchemaEx.getDiscriminatedType(ast, {});
  const fullDiscriminatorProps = fullType ? getFormProperties(fullType) : activeProps;
  return activeProps.map((prop) =>
    discriminators.has(prop.name.toString())
      ? (fullDiscriminatorProps.find((candidate) => candidate.name === prop.name) ?? prop)
      : prop,
  );
};

/**
 * Get the property types of an AST and filter out properties that are not form inputs.
 *
 * The `FormInputAnnotation` is read from the raw property signature's AST (before
 * `encodedBoundAST` is applied by `SchemaEx.getProperties`), because `encodedBoundAST` strips
 * annotations from non-keyword inner types (e.g., `Schema.Struct`, `Schema.Array`).
 * Without this, fields like `Routine.input` (a JsonSchema struct) annotated
 * `FormInputAnnotation.set(false)` would still render in the form.
 *
 * For optional fields, `prop.type` is the union `T | undefined` — the annotation
 * lives on the inner `T`. Unwrap before reading so that the conventional pattern
 * `Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional)` works.
 *
 * Container properties (nested structs, unions, arrays) keep their *raw* AST rather than
 * the `encodedBoundAST` produced by `SchemaEx.getProperties`. `encodedBoundAST` strips annotations
 * from non-keyword inner types, so a `FormInputAnnotation` nested beneath an encoded container
 * (e.g. `RouteLeg.geometry`, reached via `Segment → details → routes → Route → legs`) would
 * otherwise be lost by the time recursion reaches it. Leaf/transformation fields stay encoded
 * (e.g. a `DateTime` still renders as its encoded string input).
 */
export const getFormProperties = (ast: SchemaAST.AST): SchemaEx.SchemaProperty[] => {
  const signatures = SchemaAST.getPropertySignatures(ast);
  const rawByName = new Map<PropertyKey, SchemaAST.AST>(signatures.map((prop) => [prop.name, unwrapOptional(prop)]));
  const hidden = new Set(
    signatures
      .filter(
        (prop) =>
          Annotation.FormInputAnnotation.getFromAst(unwrapOptional(prop)).pipe(Option.getOrElse(() => true)) === false,
      )
      .map((prop) => prop.name),
  );
  return SchemaEx.getProperties(ast)
    .filter((prop) => !hidden.has(prop.name))
    .map((prop) => {
      const raw = rawByName.get(prop.name);
      return raw && (SchemaEx.isNestedType(raw) || SchemaEx.isArrayType(raw)) ? { ...prop, type: raw } : prop;
    });
};
