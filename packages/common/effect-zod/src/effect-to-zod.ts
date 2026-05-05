//
// Copyright 2026 DXOS.org
//

// Effect Schema → Zod converter, scoped to the patterns we use in MCP tool
// inputs. The MCP SDK requires zod schemas for `inputSchema`, but we want to
// author tool inputs in Effect Schema so:
//
//   1. The same definitions can be consumed by `react-ui-form` (which renders
//      forms from Effect Schema directly).
//   2. We get Effect's annotation system (Description, Title, JSONSchema)
//      everywhere, plus refinements that compose cleanly with the rest of
//      the codebase.
//
// What's supported (anything outside this list throws at startup with a clear
// message — strict denylist beats silent miscompilation):
//
//   Schema.String                       → z.string()
//   Schema.Number                       → z.number()
//   Schema.Boolean                      → z.boolean()
//   Schema.Literal('a','b')             → z.enum(['a','b'])
//   Schema.Array(x)                     → z.array(zodOf(x))
//   Schema.optional(x)                  → .optional()
//   Schema.int()                        → .int()        (via JSONSchema annotation)
//   Schema.positive()                   → .positive()   (via JSONSchema annotation)
//   Schema.lessThanOrEqualTo(n)         → .max(n)       (via JSONSchema annotation)
//   description annotation              → .describe(...)
//
// We read refinements off the JSONSchema annotation Effect attaches to its
// stdlib refinements, NOT off SchemaId symbols — that gives us a stable
// integration point that doesn't break across Effect minor versions.

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { z } from 'zod';

const DescriptionAnnotationId = Symbol.for('effect/annotation/Description');
const JSONSchemaAnnotationId = Symbol.for('effect/annotation/JSONSchema');

/**
 * Convert the fields of an Effect `Schema.Struct(...)` into the
 * `Record<string, z.ZodTypeAny>` shape the MCP SDK's `registerTool` expects
 * for `inputSchema`.
 */
export const effectFieldsToZod = <Fields extends Schema.Struct.Fields>(
  schema: Schema.Struct<Fields>,
): Record<keyof Fields & string, z.ZodTypeAny> => {
  const out: Record<string, z.ZodTypeAny> = {};
  for (const [name, prop] of Object.entries(schema.fields)) {
    try {
      out[name] = propToZod((prop as { ast: SchemaAST.AST }).ast);
    } catch (err) {
      throw new Error(`effectFieldsToZod: failed to convert field "${name}": ${(err as Error).message}`);
    }
  }
  return out as Record<keyof Fields & string, z.ZodTypeAny>;
};

/**
 * Convert one struct field's AST. Property signatures wrap the actual schema
 * AST with optional/readonly metadata; required fields are the AST directly.
 */
const propToZod = (ast: SchemaAST.AST): z.ZodTypeAny => {
  if (ast._tag === 'PropertySignatureDeclaration') {
    // `Schema.optional(X)` produces a PropertySignatureDeclaration whose `type`
    // is `Union(X, UndefinedKeyword)`. Peel UndefinedKeyword before recursing
    // so the converter operates on the user-facing type, then mark optional.
    const description = readDescription(ast);
    const innerAst = unwrapOptionalUnion(ast.type, ast.isOptional);
    let zod = astToZod(innerAst);
    if (ast.isOptional) {
      zod = zod.optional();
    }
    if (description !== undefined) {
      zod = zod.describe(description);
    }
    return zod;
  }
  return astToZod(ast);
};

/**
 * Peel `UndefinedKeyword` from an optional field's union. Effect models
 * `optional(X)` as `Union(X, UndefinedKeyword)`; if that's what we have AND
 * the prop is optional, return X. Otherwise pass through unchanged.
 */
const unwrapOptionalUnion = (ast: SchemaAST.AST, isOptional: boolean): SchemaAST.AST => {
  if (!isOptional || ast._tag !== 'Union') {
    return ast;
  }
  const types = ast.types.filter((t) => t._tag !== 'UndefinedKeyword');
  if (types.length === 1) {
    return types[0];
  }
  // Multi-branch union after stripping undefined — preserve as a Union; the
  // top-level switch handles literal-only unions (enums). Anything else
  // throws with a clear message.
  return { ...ast, types };
};

const astToZod = (ast: SchemaAST.AST): z.ZodTypeAny => {
  let zod: z.ZodTypeAny;
  switch (ast._tag) {
    case 'StringKeyword':
      zod = z.string();
      break;
    case 'NumberKeyword':
      zod = z.number();
      break;
    case 'BooleanKeyword':
      zod = z.boolean();
      break;
    case 'Literal':
      // `z.literal` accepts string | number | boolean | null. Effect's literal
      // value is already constrained to those by Schema.Literal's signature.
      zod = z.literal((ast as { literal: string | number | boolean | null }).literal);
      break;
    case 'Union': {
      // Only support unions where every branch is a string literal — that's
      // what `Schema.Literal('a', 'b', 'c')` produces, and it maps directly
      // to `z.enum`. Other unions (mixed types, refinements) aren't currently
      // used in our tool inputs and would need a richer conversion.
      const types = (ast as { types: SchemaAST.AST[] }).types;
      const allStringLiteral = types.every(
        (t) => t._tag === 'Literal' && typeof (t as { literal: unknown }).literal === 'string',
      );
      if (!allStringLiteral) {
        throw new Error(
          `unsupported Union — only enum-of-string-literals supported, got branches: ${types.map((t) => t._tag).join(', ')}`,
        );
      }
      const values = types.map((t) => (t as { literal: string }).literal) as [string, ...string[]];
      zod = z.enum(values);
      break;
    }
    case 'TupleType': {
      // `Schema.Array(X)` produces a TupleType with a single rest element of
      // type X. Fixed tuples (`Schema.Tuple(...)`) aren't currently used.
      const tuple = ast as { rest?: ReadonlyArray<{ type: SchemaAST.AST }>; elements?: ReadonlyArray<unknown> };
      if (tuple.elements && tuple.elements.length > 0) {
        throw new Error('fixed-length tuples are not supported — use Schema.Array(X)');
      }
      const elem = tuple.rest?.[0]?.type;
      if (!elem) {
        throw new Error('TupleType without rest element — Schema.Array(X) is the only supported array form');
      }
      zod = z.array(astToZod(elem));
      break;
    }
    case 'Refinement': {
      // Walk the refinement chain down to the base type, collecting JSONSchema
      // annotations along the way. Apply each refinement's Zod equivalent on
      // top of the base. Order is deterministic: int → positive → max, so we
      // never trigger Zod's "method must come after .int()" sequencing rule.
      const { base, jsonSchemas } = collectRefinements(ast);
      let z0 = astToZod(base);
      for (const js of jsonSchemas) {
        z0 = applyJsonSchemaRefinement(z0, js);
      }
      zod = z0;
      break;
    }
    default:
      throw new Error(`unsupported Effect Schema AST node: ${ast._tag}`);
  }

  // Pass through Description annotation. This includes Effect's stdlib
  // defaults ("a string", "a positive number") if the user didn't override —
  // tool authors should always supply their own description for LLM trigger
  // accuracy, but we don't enforce that here.
  const description = readDescription(ast);
  if (description !== undefined) {
    zod = zod.describe(description);
  }
  return zod;
};

const collectRefinements = (
  ast: SchemaAST.AST,
): { base: SchemaAST.AST; jsonSchemas: Array<Record<string, unknown>> } => {
  const jsonSchemas: Array<Record<string, unknown>> = [];
  let cursor: SchemaAST.AST = ast;
  while (cursor._tag === 'Refinement') {
    const js = (cursor as { annotations?: Record<symbol, unknown> }).annotations?.[JSONSchemaAnnotationId];
    if (typeof js === 'object' && js !== null) {
      jsonSchemas.push(js as Record<string, unknown>);
    } else {
      throw new Error(
        'Refinement is missing a JSONSchema annotation — only Effect stdlib refinements (int, positive, lessThanOrEqualTo, etc.) are currently supported',
      );
    }
    cursor = (cursor as { from: SchemaAST.AST }).from;
  }
  // Innermost refinements were pushed first; reverse so outer refinements
  // (e.g. `lessThanOrEqualTo`) apply LAST, after `.int().positive()` etc.
  jsonSchemas.reverse();
  return { base: cursor, jsonSchemas };
};

/**
 * Map a JSON Schema fragment from one Effect refinement to a Zod method on a
 * `z.number()`. We only translate the shapes Effect emits for its stdlib
 * refinements — anything else throws so the converter doesn't silently
 * generate an under-constrained Zod schema.
 */
const applyJsonSchemaRefinement = (zod: z.ZodTypeAny, js: Record<string, unknown>): z.ZodTypeAny => {
  // Only z.number() supports the methods we need. Defensive cast.
  let z0 = zod as z.ZodNumber;
  let touched = false;
  if (js.type === 'integer') {
    z0 = z0.int();
    touched = true;
  }
  if (typeof js.exclusiveMinimum === 'number' && js.exclusiveMinimum === 0) {
    z0 = z0.positive();
    touched = true;
  }
  if (typeof js.maximum === 'number') {
    z0 = z0.max(js.maximum);
    touched = true;
  }
  if (typeof js.minimum === 'number') {
    z0 = z0.min(js.minimum);
    touched = true;
  }
  if (!touched) {
    throw new Error(`unsupported JSONSchema refinement fragment: ${JSON.stringify(js)}`);
  }
  return z0;
};

const readDescription = (ast: SchemaAST.AST): string | undefined => {
  const annotations = (ast as { annotations?: Record<symbol, unknown> }).annotations;
  if (!annotations) {
    return undefined;
  }
  const value = annotations[DescriptionAnnotationId];
  return typeof value === 'string' ? value : undefined;
};
