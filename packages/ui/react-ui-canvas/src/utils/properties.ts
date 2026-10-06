//
// Copyright 2026 DXOS.org
//

//
// Editing several elements in one form: the properties every selected type declares alike, the values
// they share (and the paths they disagree on), and the patch an edit makes to each element.
//

import * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';

import { getPropertySignatures, pick } from '@dxos/effect/SchemaAST';

type Values = Readonly<Record<string, unknown>>;

const isPlainObject = (value: unknown): value is Values =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptional = (ast: SchemaAST.AST) => ast.context?.isOptional ?? false;

/**
 * Whether two property types describe the same values, so one field can edit both. Separately declared
 * types compare by structure: `locked` on a node and on a link is the same optional boolean.
 */
export const sameType = (left: SchemaAST.AST, right: SchemaAST.AST): boolean => {
  if (left === right) {
    return true;
  }
  if (left._tag !== right._tag || isOptional(left) !== isOptional(right)) {
    return false;
  }
  if (left._tag === 'Literal' && right._tag === 'Literal') {
    return left.literal === right.literal;
  }
  if (left._tag === 'Union' && right._tag === 'Union') {
    return sameList(left.types, right.types);
  }
  if (left._tag === 'Arrays' && right._tag === 'Arrays') {
    return sameList(left.elements, right.elements) && sameList(left.rest, right.rest);
  }
  if (left._tag === 'Objects' && right._tag === 'Objects') {
    const others = new Map(right.propertySignatures.map((property) => [property.name, property.type]));
    return (
      left.propertySignatures.length === right.propertySignatures.length &&
      left.propertySignatures.every((property) => {
        const other = others.get(property.name);
        return other !== undefined && sameType(property.type, other);
      })
    );
  }
  return true;
};

const sameList = (left: readonly SchemaAST.AST[], right: readonly SchemaAST.AST[]) =>
  left.length === right.length && left.every((type, index) => sameType(type, right[index]));

/**
 * The properties every schema declares alike, as one struct over the first schema's declarations;
 * `undefined` when they share none. One schema is its own common schema.
 */
export const commonSchema = (schemas: readonly Schema.Codec<any, any>[]): Schema.Codec<any, any> | undefined => {
  const [first, ...rest] = schemas;
  if (!first) {
    return undefined;
  }
  const shared = getPropertySignatures(first.ast)
    .filter((property) =>
      rest.every((schema) =>
        getPropertySignatures(schema.ast).some(
          (other) => other.name === property.name && sameType(property.type, other.type),
        ),
      ),
    )
    .map((property) => property.name);
  return shared.length > 0 ? Schema.make<Schema.Codec<any, any>>(pick(first.ast, shared)) : undefined;
};

const equal = (left: unknown, right: unknown): boolean => {
  if (left === right) {
    return true;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => equal(value, right[index]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => equal(left[key], right[key]));
  }
  return false;
};

export type MergedValues = {
  /** The shared value at every path; where the objects disagree, the first object's, so the form still validates. */
  values: Values;
  /** Json-paths (`style.hue`) whose value differs between the objects. */
  mixed: Set<string>;
};

/** Merges the objects' `keys` for one form, descending into nested objects so a struct is mixed field by field. */
export const mergeValues = (objects: readonly Values[], keys: readonly PropertyKey[]): MergedValues => {
  const mixed = new Set<string>();
  const merge = (sources: readonly Values[], names: readonly string[], prefix: string): Values =>
    Object.fromEntries(
      names.flatMap((name) => {
        const path = prefix ? `${prefix}.${name}` : name;
        const values = sources.map((source) => source[name]);
        if (values.every(isPlainObject)) {
          const nested = [...new Set(values.flatMap((value) => Object.keys(value)))];
          return [[name, merge(values, nested, path)]];
        }
        if (!values.every((value) => equal(value, values[0]))) {
          mixed.add(path);
        }
        const value = values.find((value) => value !== undefined);
        return value === undefined ? [] : [[name, value]];
      }),
    );
  const names = keys.filter((key): key is string => typeof key === 'string');
  return { values: merge(objects, names, ''), mixed };
};

const getIn = (value: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((current, key) => (isPlainObject(current) ? current[key] : undefined), value);

const setIn = (value: unknown, path: readonly string[], next: unknown): unknown => {
  const [head, ...rest] = path;
  if (head === undefined) {
    return next;
  }
  const current = isPlainObject(value) ? value : {};
  return { ...current, [head]: setIn(current[head], rest, next) };
};

/**
 * The top-level values an edit writes to one element: each changed json-path set to the form's value,
 * leaving the element's other nested fields (the rest of its `style`) as they were.
 */
export const patchValues = (element: Values, values: Values, paths: readonly string[]): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  for (const path of paths) {
    const [head, ...rest] = path.split('.');
    patch[head] = setIn(head in patch ? patch[head] : element[head], rest, getIn(values, path.split('.')));
  }
  return patch;
};
