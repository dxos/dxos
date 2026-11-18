//
// Copyright 2026 DXOS.org
//

import { ARTIFACT_URI_DESCRIPTION } from '@dxos/assistant';

/**
 * The parts of a JSON Schema a tool's input projection uses, read from the tool's `parameters`.
 */
type JsonSchema = {
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly items?: JsonSchema;
  readonly anyOf?: readonly JsonSchema[];
  readonly oneOf?: readonly JsonSchema[];
  readonly enum?: readonly unknown[];
  readonly const?: unknown;
  readonly description?: string;
  readonly additionalProperties?: boolean | JsonSchema;
};

/** Nesting below which an object is named only `object`, as the types section does. */
const MAX_DEPTH = 4;

/** How a reference field reads: the formats it accepts are stated once, beside the operations. */
export const REF_LABEL = 'Ref';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const schemaOf = (value: unknown): JsonSchema => (isRecord(value) ? value : {});

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const unionOf = (labels: readonly string[]): string => [...new Set(labels)].join(' | ') || 'unknown';

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

const REFERENCE_DESCRIPTION = squash(ARTIFACT_URI_DESCRIPTION);

/**
 * A reference field's own description, without the formats every reference repeats (which end its description, after
 * the field's own words when it has some): `''` for a reference with none, `undefined` for a field that is not one.
 * Compared without whitespace, which formatting changes.
 */
const referenceNote = ({ description }: JsonSchema): string | undefined => {
  if (description === undefined) {
    return undefined;
  }
  const text = squash(description);
  if (text === REFERENCE_DESCRIPTION) {
    return '';
  }
  return text.endsWith(` ${REFERENCE_DESCRIPTION}`) ? text.slice(0, -REFERENCE_DESCRIPTION.length).trim() : undefined;
};

const isReference = (node: JsonSchema): boolean => referenceNote(node) !== undefined;

/** A comment carrying a field's description, on one line. */
const commentOf = (description: string | undefined): string =>
  description ? ` /* ${description.replace(/\s+/g, ' ').replace(/\*\//g, '* /').trim()} */` : '';

const labelOf = (node: JsonSchema, depth: number): string => {
  if (isReference(node)) {
    return REF_LABEL;
  }
  if (node.const !== undefined) {
    return JSON.stringify(node.const);
  }
  if (node.enum !== undefined) {
    return unionOf(node.enum.map((value) => JSON.stringify(value)));
  }
  const variants = node.anyOf ?? node.oneOf;
  if (variants !== undefined) {
    return unionOf(variants.map((variant) => labelOf(schemaOf(variant), depth)));
  }
  if (Array.isArray(node.type)) {
    return unionOf(node.type.map((type) => labelOf({ ...node, type }, depth)));
  }
  switch (node.type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array': {
      const item = node.items === undefined ? 'unknown' : labelOf(schemaOf(node.items), depth + 1);
      return item.includes(' | ') ? `(${item})[]` : `${item}[]`;
    }
    case 'object':
    case undefined: {
      const properties = Object.entries(node.properties ?? {});
      if (properties.length === 0) {
        return node.type === 'object' ? 'object' : 'unknown';
      }
      if (depth > MAX_DEPTH) {
        return 'object';
      }
      const required = new Set(node.required ?? []);
      const fields = properties.map(([name, property]) => {
        const field = schemaOf(property);
        const key = IDENTIFIER.test(name) ? name : JSON.stringify(name);
        // A reference keeps only its own words: the formats it takes are stated once beside the operations.
        const description = referenceNote(field) ?? field.description;
        return `${key}${required.has(name) ? '' : '?'}: ${labelOf(field, depth + 1)}${commentOf(description)}`;
      });
      const open = node.additionalProperties === true ? ', …' : '';
      return `{ ${fields.join(', ')}${open} }`;
    }
    default:
      return 'unknown';
  }
};

/**
 * A tool's input as code mode states it: a TypeScript-like label read from the tool's JSON Schema, each field's
 * description kept as a comment, e.g. `{ query?: string /* Words to match. *\/, limit?: number }`.
 *
 * The JSON Schema itself repeats what the label says in far more characters, and a reference field carries the whole
 * {@link ARTIFACT_URI_DESCRIPTION} every time; the label names it {@link REF_LABEL} instead.
 */
export const renderJsonInput = (parameters: unknown): string => {
  const schema = schemaOf(parameters);
  if (schema.type === 'object' && Object.keys(schema.properties ?? {}).length === 0) {
    return '{}';
  }
  return labelOf(schema, 0);
};
