//
// Copyright 2026 DXOS.org
//

//
// Editing several elements in one form: the properties every selected type declares alike, the values
// they share (and the paths they disagree on), and the patch an edit makes to each element.
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { getChecks, getPropertySignatures } from '@dxos/effect/SchemaAST';

type Values = Readonly<Record<string, unknown>>;

/** A record of fields to merge into; an instance (an ECHO `Ref`, a date) is a value, compared and kept whole. */
const isPlainObject = (value: unknown): value is Values => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isOptional = (ast: SchemaAST.AST) => ast.context?.isOptional ?? false;

/** A check as comparable data: the filter and its payload (`isBetween` with its bounds), if it declares them. */
const checkKey = (check: SchemaAST.Check<any>): string | undefined => {
  const representation = check.annotations?.representation;
  return representation === undefined ? undefined : JSON.stringify(representation);
};

/** Whether two types carry the same checks, so a value one accepts the other does too. */
const sameChecks = (left: SchemaAST.AST, right: SchemaAST.AST): boolean => {
  const [leftChecks, rightChecks] = [getChecks(left), getChecks(right)];
  // A check that declares no representation cannot be compared, so only the same check matches it.
  const same = (check: SchemaAST.Check<any>, other: SchemaAST.Check<any>) => {
    const key = checkKey(check);
    return check === other || (key !== undefined && key === checkKey(other));
  };
  return (
    leftChecks.length === rightChecks.length && leftChecks.every((check, index) => same(check, rightChecks[index]))
  );
};

/**
 * Whether two property types describe the same values, so one field can edit both. Separately declared
 * types compare by structure and by their checks: `locked` on a node and on a link is the same optional
 * boolean, but numbers bounded differently are not, since the form validates against only one of them.
 */
export const sameType = (left: SchemaAST.AST, right: SchemaAST.AST): boolean => {
  if (left === right) {
    return true;
  }
  if (left._tag !== right._tag || isOptional(left) !== isOptional(right) || !sameChecks(left, right)) {
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
 * What two property types share: the type itself when they are the same, and for two structs (a node's style and a
 * link's, say) the struct of the fields they declare alike, recursively; none when they share nothing.
 */
const commonType = (left: SchemaAST.AST, right: SchemaAST.AST): SchemaAST.AST | undefined => {
  if (sameType(left, right)) {
    return left;
  }
  // An optional struct is a union with `undefined`: intersect member by member.
  if (left._tag === 'Union' && right._tag === 'Union' && left.types.length === right.types.length) {
    const types = left.types.map((type, index) => commonType(type, right.types[index]));
    return types.every((type) => type !== undefined)
      ? new SchemaAST.Union(
          types.flatMap((type) => (type ? [type] : [])),
          left.options,
          left.annotations,
          left.checks,
          left.encoding,
          left.context,
          left.encodingChecks,
        )
      : undefined;
  }
  if (left._tag !== 'Objects' || right._tag !== 'Objects' || isOptional(left) !== isOptional(right)) {
    return undefined;
  }
  const shared = left.propertySignatures.flatMap((property) => {
    const other = right.propertySignatures.find((candidate) => candidate.name === property.name);
    const type = other && commonType(property.type, other.type);
    return type ? [new SchemaAST.PropertySignature(property.name, type)] : [];
  });
  return shared.length > 0
    ? new SchemaAST.Objects(
        shared,
        left.indexSignatures,
        left.annotations,
        left.checks,
        left.encoding,
        left.context,
        left.encodingChecks,
      )
    : undefined;
};

/**
 * The properties every schema declares alike, as one struct over the first schema's declarations, a struct
 * property narrowed to the fields every schema's declares alike; `undefined` when they share none. One schema is
 * its own common schema.
 */
export const commonSchema = (schemas: readonly Schema.Codec<any, any>[]): Schema.Codec<any, any> | undefined => {
  const [first, ...rest] = schemas;
  if (!first) {
    return undefined;
  }
  const shared = getPropertySignatures(first.ast).flatMap((property) => {
    let type: SchemaAST.AST | undefined = property.type;
    for (const schema of rest) {
      const other = getPropertySignatures(schema.ast).find((candidate) => candidate.name === property.name);
      type = type && other ? commonType(type, other.type) : undefined;
    }
    return type ? [new SchemaAST.PropertySignature(property.name, type)] : [];
  });
  return shared.length > 0 ? Schema.make<Schema.Codec<any, any>>(new SchemaAST.Objects(shared, [])) : undefined;
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
