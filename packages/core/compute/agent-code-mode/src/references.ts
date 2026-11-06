//
// Copyright 2026 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';

import { RefFromLLM } from '@dxos/assistant';

import type { SandboxOperation } from './Dialect.ts';

/**
 * The reference format the tool projection writes into every reference field of an operation's JSON schema
 * (`RefFromLLM`'s description), after the field's own description when it finds one. Stated once in a code-mode
 * prompt instead: on an agent with a few dozen operations it is most of the operations section.
 */
export const REFERENCE_FORMAT: string = SchemaAST.resolveDescription(RefFromLLM.ast) ?? '';

/** What a reference field says in place of the format, after its own description. */
export const REFERENCE_NOTE = 'An object reference (see References).';

/**
 * An operation's input JSON schema with each reference field's format text and examples replaced by
 * {@link REFERENCE_NOTE}, keeping the field's own description. A top-level field whose own description the projection
 * dropped gets it back from the operation's input schema. Every other node is left as the tool path validates it.
 */
export const compactReferences = (operation: SandboxOperation): unknown => {
  const own = topLevelDescriptions(operation);
  const walk = (node: unknown, field?: string): unknown => {
    if (Array.isArray(node)) {
      return node.map((item) => walk(item));
    }
    if (typeof node !== 'object' || node === null) {
      return node;
    }
    const reference = referenceDescription(node);
    if (reference !== undefined) {
      const { examples: _examples, ...rest } = node as Record<string, unknown>;
      const description = reference || (field !== undefined ? own.get(field) : undefined);
      return { ...rest, description: description ? `${description} ${REFERENCE_NOTE}` : REFERENCE_NOTE };
    }
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, walk(value)]));
  };
  const parameters = operation.parameters;
  if (typeof parameters !== 'object' || parameters === null || !('properties' in parameters)) {
    return walk(parameters);
  }
  const properties = parameters.properties as Record<string, unknown>;
  return {
    ...(walk({ ...parameters, properties: {} }) as object),
    // A top-level field is walked with its name, so a description the projection dropped can be restored.
    properties: Object.fromEntries(Object.entries(properties).map(([name, value]) => [name, walk(value, name)])),
  };
};

/** Whether any field of the operation's input is a reference. */
export const hasReferences = (operation: SandboxOperation): boolean =>
  JSON.stringify(operation.parameters ?? null).includes(JSON.stringify(REFERENCE_FORMAT).slice(1, -1));

/**
 * The field's own description if `node` is a reference field (empty when it has none), else `undefined`. The
 * projection writes the format alone or after the field's description, separated by a newline.
 */
const referenceDescription = (node: object): string | undefined => {
  const description = 'description' in node ? node.description : undefined;
  if (typeof description !== 'string' || REFERENCE_FORMAT.length === 0) {
    return undefined;
  }
  if (description === REFERENCE_FORMAT) {
    return '';
  }
  return description.endsWith(`\n${REFERENCE_FORMAT}`)
    ? description.slice(0, -REFERENCE_FORMAT.length - 1).trim()
    : undefined;
};

/** The own description of each top-level field of the operation's input, read from its schema. */
const topLevelDescriptions = (operation: SandboxOperation): Map<string, string> => {
  const ast = operation.definition?.input.ast;
  if (ast === undefined || !SchemaAST.isObjects(ast)) {
    return new Map();
  }
  return new Map(
    ast.propertySignatures.flatMap((property) => {
      const description = SchemaAST.resolveDescription(property.type);
      return description !== undefined && description !== REFERENCE_FORMAT
        ? [[String(property.name), description] as const]
        : [];
    }),
  );
};
