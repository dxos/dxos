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
//   Schema.Literals(['a', 'b'])         → z.enum(['a','b'])
//   Schema.Array(x)                     → z.array(zodOf(x))
//   Schema.optional(x)                  → .optional()
//   Schema.isInt()                      → .int()
//   Schema.isGreaterThan(0)             → .positive()
//   Schema.isLessThanOrEqualTo(n)       → .max(n)
//   description annotation              → .describe(...)
//
// Refinements are read off the `representation` annotation Effect attaches to
// every stdlib check — a stable, named identity (`effect/schema/isInt`) that
// survives minor versions, unlike the SchemaId symbols or the emitted JSON
// Schema fragment.

import * as Schema from 'effect/Schema';
import { z } from 'zod';

// v4 annotation keys are plain strings rather than symbols.
const DescriptionAnnotationId = 'description';
const RepresentationAnnotationId = 'representation';

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
      out[name] = propToZod(prop.ast as unknown as AnyAst);
    } catch (err) {
      throw new Error(`effectFieldsToZod: failed to convert field "${name}": ${(err as Error).message}`);
    }
  }
  return out as Record<keyof Fields & string, z.ZodTypeAny>;
};

/**
 * A structural view of an Effect 4 AST node.
 *
 * Treating `_tag` as a free string and reading fields selectively keeps the
 * converter to one shape instead of one branch per node class, and avoids
 * `as unknown as never` at every access.
 */
type AnyAst = { _tag: string; annotations?: Record<string, unknown> } & Record<string, unknown>;

/** A refinement's stable identity plus its parameters, e.g. `isLessThanOrEqualTo` / `{ maximum: 200 }`. */
type Representation = { id: string; payload: Record<string, unknown> | null };

/**
 * Convert one struct field's AST.
 *
 * v4 has no property-signature node: optionality is `context.isOptional` on the
 * field's own AST, which for `Schema.optional(X)` is `Union(X, Undefined)`. The
 * description a caller annotates onto the wrapper sits on that union.
 */
const propToZod = (ast: AnyAst): z.ZodTypeAny => {
  const isOptional = Boolean((ast.context as { isOptional?: boolean } | undefined)?.isOptional);
  if (!isOptional) {
    return astToZod(ast);
  }
  const description = readDescription(ast);
  let zod = astToZod(unwrapOptionalUnion(ast)).optional();
  if (description !== undefined) {
    zod = zod.describe(description);
  }
  return zod;
};

/**
 * Peel the `Undefined` branch an optional field's union carries, so the
 * converter operates on the user-facing type.
 */
const unwrapOptionalUnion = (ast: AnyAst): AnyAst => {
  if (ast._tag !== 'Union') {
    return ast;
  }
  const types = (ast.types as AnyAst[]).filter((type) => type._tag !== 'Undefined');
  if (types.length === 1) {
    return types[0];
  }
  // Multi-branch union after stripping undefined — preserve as a Union; the
  // top-level switch handles literal-only unions (enums). Anything else
  // throws with a clear message.
  return { ...ast, types } as AnyAst;
};

const astToZod = (ast: AnyAst): z.ZodTypeAny => {
  let zod: z.ZodTypeAny;
  switch (ast._tag) {
    case 'String':
      zod = z.string();
      break;
    case 'Number':
      zod = z.number();
      break;
    case 'Boolean':
      zod = z.boolean();
      break;
    case 'Literal':
      // `z.literal` accepts string | number | boolean | null. Effect's literal
      // value is already constrained to those by Schema.Literal's signature.
      zod = z.literal(ast.literal as string | number | boolean | null);
      break;
    case 'Union': {
      // Only support unions where every branch is a string literal — that's
      // what `Schema.Literals(['a', 'b', 'c'])` produces, and it maps directly
      // to `z.enum`. Other unions (mixed types, refinements) aren't currently
      // used in our tool inputs and would need a richer conversion.
      const types = ast.types as AnyAst[];
      const allStringLiteral = types.every((type) => type._tag === 'Literal' && typeof type.literal === 'string');
      if (!allStringLiteral) {
        throw new Error(
          `unsupported Union — only enum-of-string-literals supported, got branches: ${types.map((type) => type._tag).join(', ')}`,
        );
      }
      const values = types.map((type) => type.literal as string) as [string, ...string[]];
      zod = z.enum(values);
      break;
    }
    case 'Arrays': {
      // `Schema.Array(X)` produces an `Arrays` node with a single rest type X.
      // Fixed tuples (`Schema.Tuple(...)`) aren't currently used.
      const arrays = ast as { rest?: ReadonlyArray<AnyAst>; elements?: ReadonlyArray<unknown> };
      if (arrays.elements && arrays.elements.length > 0) {
        throw new Error('fixed-length tuples are not supported — use Schema.Array(X)');
      }
      const element = arrays.rest?.[0];
      if (!element) {
        throw new Error('Arrays node without rest element — Schema.Array(X) is the only supported array form');
      }
      zod = z.array(astToZod(element));
      break;
    }
    default:
      throw new Error(`unsupported Effect Schema AST node: ${ast._tag}`);
  }

  // Refinements are checks on the node rather than a wrapper node, and they
  // arrive in the order they were piped — which is also the order Zod requires
  // (`.int()` before `.positive()`).
  for (const check of (ast.checks as ReadonlyArray<AnyAst> | undefined) ?? []) {
    zod = applyCheck(zod, readRepresentation(check));
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

const readRepresentation = (check: AnyAst): Representation => {
  const representation = check.annotations?.[RepresentationAnnotationId];
  if (typeof representation !== 'object' || representation === null || !('id' in representation)) {
    throw new Error(
      'check is missing a representation annotation — only Effect stdlib refinements (isInt, isGreaterThan, isLessThanOrEqualTo, etc.) are currently supported',
    );
  }
  return representation as Representation;
};

/**
 * Map one Effect check to its Zod method.
 *
 * Only the numeric bounds we actually use are translated — anything else throws
 * so the converter never silently emits an under-constrained Zod schema.
 */
const applyCheck = (zod: z.ZodTypeAny, { id, payload }: Representation): z.ZodTypeAny => {
  const number = zod as z.ZodNumber;
  const read = (key: string): number | undefined => {
    const value = payload?.[key];
    return typeof value === 'number' ? value : undefined;
  };
  switch (id) {
    case 'effect/schema/isInt':
      return number.int();
    case 'effect/schema/isGreaterThan': {
      const bound = read('exclusiveMinimum');
      if (bound === undefined) {
        break;
      }
      // `.positive()` and `.gt(0)` are equivalent, but the former is what a
      // hand-written schema would say.
      return bound === 0 ? number.positive() : number.gt(bound);
    }
    case 'effect/schema/isGreaterThanOrEqualTo': {
      const bound = read('minimum');
      return bound === undefined ? zod : number.min(bound);
    }
    case 'effect/schema/isLessThan': {
      const bound = read('exclusiveMaximum');
      return bound === undefined ? zod : number.lt(bound);
    }
    case 'effect/schema/isLessThanOrEqualTo': {
      const bound = read('maximum');
      return bound === undefined ? zod : number.max(bound);
    }
  }
  throw new Error(`unsupported refinement: ${id}`);
};

const readDescription = (ast: AnyAst): string | undefined => {
  const annotations = ast.annotations;
  if (!annotations) {
    return undefined;
  }
  const value = annotations[DescriptionAnnotationId];
  return typeof value === 'string' ? value : undefined;
};
