//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

/**
 * The type term the propagator emits — see `design/TYPES.md`. Symbols are IRIs; everything else is
 * TypeScript's structural vocabulary. Constructors normalize, so two equal types have equal
 * {@link text}.
 */

export const LIB_BASE = 'https://dxos.org/deus/lib#';

export const libIri = (name: string): string => `${LIB_BASE}${name}`;

export type PrimitiveName =
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'symbol'
  | 'null'
  | 'undefined'
  | 'void'
  | 'never'
  | 'any'
  | 'unknown'
  | 'object';

export type Property = {
  readonly name: string;
  readonly type: Type;
  readonly optional: boolean;
  readonly readonly: boolean;
};

export type IndexSignature = { readonly key: Type; readonly type: Type; readonly readonly: boolean };

export type Span = { readonly start: number; readonly end: number };

export type Element = { readonly type: Type; readonly optional: boolean; readonly rest: boolean };

export type Param = { readonly type: Type; readonly optional: boolean; readonly rest: boolean };

/**
 * An operation a deferred term owes once it is bound: what inference would have applied to the
 * named type had it been known here (`let x = imported` widens, `x!` drops nullish members).
 */
export type Pending = 'widen' | 'settle' | 'nonNullish' | 'noUndefined';

export type Type =
  /** Inference gave up here, and says why — distinct from TypeScript's own `unknown` primitive. */
  | { readonly kind: 'unresolved'; readonly reason: string }
  | { readonly kind: 'primitive'; readonly name: PrimitiveName }
  /** `fresh` marks a literal TypeScript widens when it flows into a mutable location; not part of the identity. */
  | { readonly kind: 'literal'; readonly value: string | number | boolean | bigint; readonly fresh: boolean }
  /** `origin` is the source span of the type syntax a ref was read from — not part of the identity. */
  | { readonly kind: 'ref'; readonly iri: string; readonly args: readonly Type[]; readonly origin?: Span }
  /** The type of a named value, bound later by the cross-file pass (`Bind.ts`). */
  | { readonly kind: 'typeof'; readonly iri: string; readonly pending: readonly Pending[] }
  /** What calling `callee` with arguments of these types returns — deferred like `typeof`. */
  | {
      readonly kind: 'returnOf';
      readonly callee: Type;
      readonly args: readonly Type[];
      readonly pending: readonly Pending[];
    }
  | { readonly kind: 'union'; readonly members: readonly Type[] }
  | { readonly kind: 'intersection'; readonly members: readonly Type[] }
  | { readonly kind: 'object'; readonly properties: readonly Property[]; readonly indexes: readonly IndexSignature[] }
  | { readonly kind: 'tuple'; readonly elements: readonly Element[]; readonly readonly: boolean }
  | {
      readonly kind: 'function';
      readonly typeParams: readonly string[];
      readonly params: readonly Param[];
      readonly returns: Type;
    }
  | { readonly kind: 'param'; readonly name: string };

export type Kind = Type['kind'];

//
// Constructors.
//

const unresolvedByReason = new Map<string, Type>();

/** A position inference could not type, with the reason — the bucket an improvement would move. */
export const unresolved = (reason: string): Type => {
  let found = unresolvedByReason.get(reason);
  if (!found) {
    found = { kind: 'unresolved', reason };
    unresolvedByReason.set(reason, found);
  }
  return found;
};

const primitives = new Map<PrimitiveName, Type>();

export const primitive = (name: PrimitiveName): Type => {
  let found = primitives.get(name);
  if (!found) {
    found = { kind: 'primitive', name };
    primitives.set(name, found);
  }
  return found;
};

export const string = primitive('string');
export const number = primitive('number');
export const boolean = primitive('boolean');
export const bigint = primitive('bigint');
export const undefined_ = primitive('undefined');
export const null_ = primitive('null');
export const void_ = primitive('void');
export const never = primitive('never');
export const any = primitive('any');

export const literal = (value: string | number | boolean | bigint, fresh = false): Type => ({
  kind: 'literal',
  value,
  fresh,
});

export const ref = (iri: string, args: readonly Type[] = [], origin?: Span): Type =>
  origin ? { kind: 'ref', iri, args, origin } : { kind: 'ref', iri, args };

export const lib = (name: string, args: readonly Type[] = []): Type => ref(libIri(name), args);

export const typeOf = (iri: string, pending: readonly Pending[] = []): Type => ({ kind: 'typeof', iri, pending });

export const returnOf = (callee: Type, args: readonly Type[], pending: readonly Pending[] = []): Type => ({
  kind: 'returnOf',
  callee,
  args,
  pending,
});

export const isDeferred = (type: Type): type is Extract<Type, { kind: 'typeof' | 'returnOf' }> =>
  type.kind === 'typeof' || type.kind === 'returnOf';

/** Record an operation on a deferred term, to be applied when the cross-file pass binds it. */
const owe = (type: Extract<Type, { kind: 'typeof' | 'returnOf' }>, operation: Pending): Type =>
  type.kind === 'typeof'
    ? typeOf(type.iri, [...type.pending, operation])
    : returnOf(type.callee, type.args, [...type.pending, operation]);

export const param = (name: string): Type => ({ kind: 'param', name });

export const array = (element: Type): Type => lib('Array', [element]);

export const promise = (value: Type): Type => lib('Promise', [value]);

export const object = (properties: readonly Property[], indexes: readonly IndexSignature[] = []): Type => ({
  kind: 'object',
  properties: [...properties].sort((left, right) => compare(left.name, right.name)),
  indexes: [...indexes].sort((left, right) => compare(text(left.key), text(right.key))),
});

export const tuple = (elements: readonly Element[], readonly = false): Type => ({ kind: 'tuple', elements, readonly });

export const fn = (params: readonly Param[], returns: Type, typeParams: readonly string[] = []): Type => ({
  kind: 'function',
  typeParams,
  params,
  returns,
});

const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const baseOf = (type: Type): Type | undefined => {
  if (type.kind !== 'literal') {
    return undefined;
  }
  switch (typeof type.value) {
    case 'string':
      return string;
    case 'number':
      return number;
    case 'boolean':
      return boolean;
    case 'bigint':
      return bigint;
    default:
      return undefined;
  }
};

/**
 * A union as TypeScript forms it: flattened, without `never`, deduplicated, literals absorbed by
 * their base primitive, `true | false` as `boolean`, sorted. `unknown` (inference) is kept as a
 * member: the union is then partial, not unknown.
 */
export const union = (members: readonly Type[]): Type => {
  const flat: Type[] = [];
  const push = (member: Type) => {
    if (member.kind === 'union') {
      member.members.forEach(push);
    } else if (member.kind === 'primitive' && member.name === 'boolean') {
      // TypeScript's `boolean` is `true | false`; expanding keeps absorption uniform.
      flat.push(literal(true), literal(false));
    } else if (!(member.kind === 'primitive' && member.name === 'never')) {
      flat.push(member);
    }
  };
  members.forEach(push);
  if (flat.some((member) => member.kind === 'primitive' && member.name === 'any')) {
    return any;
  }
  if (flat.some((member) => member.kind === 'primitive' && member.name === 'unknown')) {
    return primitive('unknown');
  }
  const present = new Set(flat.filter((member) => member.kind === 'primitive').map((member) => text(member)));
  const byText = new Map<string, Type>();
  for (const member of flat) {
    const base = baseOf(member);
    if (base && base !== boolean && present.has(text(base))) {
      continue;
    }
    const key = text(member);
    const existing = byText.get(key);
    // Freshness survives only if every occurrence is fresh.
    if (!existing || (existing.kind === 'literal' && existing.fresh && !(member.kind === 'literal' && member.fresh))) {
      byText.set(key, member);
    }
  }
  if (byText.has('true') && byText.has('false')) {
    const fresh = isFresh(byText.get('true')) && isFresh(byText.get('false'));
    byText.delete('true');
    byText.delete('false');
    byText.set('boolean', fresh ? freshBoolean : boolean);
  }
  const sorted = [...byText.entries()].sort(([left], [right]) => compare(left, right)).map(([, member]) => member);
  // A union of nothing but gaps says nothing a single gap does not.
  if (sorted.length > 1 && sorted.every((member) => member.kind === 'unresolved')) {
    return sorted[0];
  }
  if (sorted.length === 0) {
    return never;
  }
  return sorted.length === 1 ? sorted[0] : { kind: 'union', members: sorted };
};

/**
 * `boolean` built from two fresh literals widens to `boolean` — it already is — but must not be
 * mistaken for a non-widening one; identity is the only marker needed.
 */
const freshBoolean: Type = { kind: 'primitive', name: 'boolean' };

const isFresh = (type: Type | undefined): boolean => type?.kind === 'literal' && type.fresh;

export const intersection = (members: readonly Type[]): Type => {
  const flat: Type[] = [];
  for (const member of members) {
    if (member.kind === 'intersection') {
      flat.push(...member.members);
    } else {
      flat.push(member);
    }
  }
  const seen = new Set<string>();
  const kept = flat.filter((member) => {
    const key = text(member);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return kept.length === 1 ? kept[0] : { kind: 'intersection', members: kept };
};

/** Remove `undefined` (and with `nullish`, `null`) from a union — optionality, `!`. */
export const without = (type: Type, names: readonly PrimitiveName[]): Type => {
  if (isDeferred(type)) {
    return owe(type, names.includes('null') ? 'nonNullish' : 'noUndefined');
  }
  if (type.kind === 'union') {
    return union(
      type.members
        .map((member) => (isDeferred(member) ? without(member, names) : member))
        .filter((member) => !(member.kind === 'primitive' && names.includes(member.name))),
    );
  }
  return type.kind === 'primitive' && names.includes(type.name) ? never : type;
};

//
// Widening.
//

/** TypeScript's widening of fresh literal types, at the top level and through unions. */
export const widen = (type: Type): Type => {
  if (type.kind === 'literal') {
    return type.fresh ? (baseOf(type) ?? type) : type;
  }
  if (type === freshBoolean) {
    return boolean;
  }
  if (type.kind === 'union') {
    return union(type.members.map(widen));
  }
  return isDeferred(type) ? owe(type, 'widen') : type;
};

/** Drop freshness without widening — the literal becomes a declared one (`as const`, annotations). */
export const settle = (type: Type): Type => {
  if (type.kind === 'literal' && type.fresh) {
    return literal(type.value);
  }
  if (type === freshBoolean) {
    return boolean;
  }
  if (type.kind === 'union') {
    return union(type.members.map(settle));
  }
  return isDeferred(type) ? owe(type, 'settle') : type;
};

//
// Inspection.
//

export const isUnresolved = (type: Type): boolean => type.kind === 'unresolved';

/** Whether any position of the term is unresolved. */
export const isPartial = (type: Type): boolean => {
  switch (type.kind) {
    case 'unresolved':
      return true;
    case 'returnOf':
      return isPartial(type.callee) || type.args.some(isPartial);
    case 'ref':
      return type.args.some(isPartial);
    case 'union':
    case 'intersection':
      return type.members.some(isPartial);
    case 'object':
      return (
        type.properties.some((property) => isPartial(property.type)) ||
        type.indexes.some((index) => isPartial(index.type) || isPartial(index.key))
      );
    case 'tuple':
      return type.elements.some((element) => isPartial(element.type));
    case 'function':
      return isPartial(type.returns) || type.params.some((entry) => isPartial(entry.type));
    default:
      return false;
  }
};

/** Number of term nodes — the emission budget. */
export const size = (type: Type): number => {
  switch (type.kind) {
    case 'returnOf':
      return 1 + size(type.callee) + type.args.reduce((sum, arg) => sum + size(arg), 0);
    case 'ref':
      return 1 + type.args.reduce((sum, arg) => sum + size(arg), 0);
    case 'union':
    case 'intersection':
      return 1 + type.members.reduce((sum, member) => sum + size(member), 0);
    case 'object':
      return (
        1 +
        type.properties.reduce((sum, property) => sum + 1 + size(property.type), 0) +
        type.indexes.reduce((sum, index) => sum + size(index.type), 0)
      );
    case 'tuple':
      return 1 + type.elements.reduce((sum, element) => sum + size(element.type), 0);
    case 'function':
      return 1 + size(type.returns) + type.params.reduce((sum, entry) => sum + size(entry.type), 0);
    default:
      return 1;
  }
};

/** Substitute type parameters. */
export const instantiate = (type: Type, bindings: ReadonlyMap<string, Type>): Type => {
  if (bindings.size === 0) {
    return type;
  }
  switch (type.kind) {
    case 'param':
      return bindings.get(type.name) ?? type;
    case 'returnOf':
      return returnOf(
        instantiate(type.callee, bindings),
        type.args.map((arg) => instantiate(arg, bindings)),
        type.pending,
      );
    case 'ref':
      return ref(
        type.iri,
        type.args.map((arg) => instantiate(arg, bindings)),
      );
    case 'union':
      return union(type.members.map((member) => instantiate(member, bindings)));
    case 'intersection':
      return intersection(type.members.map((member) => instantiate(member, bindings)));
    case 'object':
      return object(
        type.properties.map((property) => ({ ...property, type: instantiate(property.type, bindings) })),
        type.indexes.map((index) => ({ ...index, type: instantiate(index.type, bindings) })),
      );
    case 'tuple':
      return tuple(
        type.elements.map((element) => ({ ...element, type: instantiate(element.type, bindings) })),
        type.readonly,
      );
    case 'function': {
      const inner = new Map(bindings);
      for (const name of type.typeParams) {
        inner.delete(name);
      }
      return fn(
        type.params.map((entry) => ({ ...entry, type: instantiate(entry.type, inner) })),
        instantiate(type.returns, inner),
        type.typeParams,
      );
    }
    default:
      return type;
  }
};

/** Whether any type parameter occurs in the term. */
export const hasParams = (type: Type): boolean => {
  switch (type.kind) {
    case 'param':
      return true;
    case 'returnOf':
      return hasParams(type.callee) || type.args.some(hasParams);
    case 'ref':
      return type.args.some(hasParams);
    case 'union':
    case 'intersection':
      return type.members.some(hasParams);
    case 'object':
      return type.properties.some((property) => hasParams(property.type));
    case 'tuple':
      return type.elements.some((element) => hasParams(element.type));
    case 'function':
      return hasParams(type.returns) || type.params.some((entry) => hasParams(entry.type));
    default:
      return false;
  }
};

/** Whether a type parameter occurs anywhere in the term. */
export const mentions = (type: Type, name: string): boolean => {
  switch (type.kind) {
    case 'param':
      return type.name === name;
    case 'returnOf':
      return mentions(type.callee, name) || type.args.some((arg) => mentions(arg, name));
    case 'ref':
      return type.args.some((arg) => mentions(arg, name));
    case 'union':
    case 'intersection':
      return type.members.some((member) => mentions(member, name));
    case 'object':
      return type.properties.some((property) => mentions(property.type, name));
    case 'tuple':
      return type.elements.some((element) => mentions(element.type, name));
    case 'function':
      return (
        !type.typeParams.includes(name) &&
        (mentions(type.returns, name) || type.params.some((entry) => mentions(entry.type, name)))
      );
    default:
      return false;
  }
};

//
// Canonical text.
//

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const propertyName = (name: string): string => (IDENTIFIER.test(name) ? name : JSON.stringify(name));

const textCache = new WeakMap<Type, string>();

/** The canonical text: equal types, equal text. Freshness is not part of it. */
export const text = (type: Type): string => {
  const cached = textCache.get(type);
  if (cached !== undefined) {
    return cached;
  }
  const computed = render(type);
  textCache.set(type, computed);
  return computed;
};

const wrap = (type: Type): string =>
  type.kind === 'union' || type.kind === 'intersection' || type.kind === 'function' ? `(${text(type)})` : text(type);

const pendingText = (pending: readonly Pending[], inner: string): string =>
  pending.reduce((wrapped, operation) => `${operation}(${wrapped})`, inner);

const render = (type: Type): string => {
  switch (type.kind) {
    case 'unresolved':
      return `?${type.reason}`;
    case 'returnOf':
      return pendingText(type.pending, `returnOf(${text(type.callee)})(${type.args.map(text).join(', ')})`);
    case 'primitive':
      return type.name;
    case 'literal':
      return typeof type.value === 'string'
        ? JSON.stringify(type.value)
        : typeof type.value === 'bigint'
          ? `${type.value}n`
          : String(type.value);
    case 'ref':
      return type.args.length === 0 ? `<${type.iri}>` : `<${type.iri}><${type.args.map(text).join(', ')}>`;
    case 'typeof':
      return pendingText(type.pending, `typeof <${type.iri}>`);
    case 'union':
      return type.members.map(wrap).join(' | ');
    case 'intersection':
      return type.members.map(wrap).join(' & ');
    case 'object': {
      const entries = [
        ...type.indexes.map((index) => `${index.readonly ? 'readonly ' : ''}[${text(index.key)}]: ${text(index.type)}`),
        ...type.properties.map(
          (property) =>
            `${property.readonly ? 'readonly ' : ''}${propertyName(property.name)}${property.optional ? '?' : ''}: ${text(property.type)}`,
        ),
      ];
      return entries.length === 0 ? '{}' : `{ ${entries.join('; ')} }`;
    }
    case 'tuple':
      return `${type.readonly ? 'readonly ' : ''}[${type.elements
        .map((element) => `${element.rest ? '...' : ''}${text(element.type)}${element.optional ? '?' : ''}`)
        .join(', ')}]`;
    case 'function': {
      const typeParams = type.typeParams.length > 0 ? `<${type.typeParams.join(', ')}>` : '';
      const params = type.params
        .map((entry) => `${entry.rest ? '...' : ''}${text(entry.type)}${entry.optional ? '?' : ''}`)
        .join(', ');
      return `${typeParams}(${params}) => ${text(type.returns)}`;
    }
    case 'param':
      return type.name;
  }
};

//
// Serialization: the cross-file pass reads a symbol's term back from the graph, freshness included,
// because widening after binding depends on it.
//

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export const toJson = (type: Type): Json => {
  switch (type.kind) {
    case 'unresolved':
      return { k: 'unresolved', r: type.reason };
    case 'primitive':
      return { k: 'primitive', n: type.name };
    case 'literal':
      return typeof type.value === 'bigint'
        ? { k: 'literal', b: type.value.toString(), f: type.fresh }
        : { k: 'literal', v: type.value, f: type.fresh };
    case 'ref':
      return { k: 'ref', i: type.iri, a: type.args.map(toJson) };
    case 'typeof':
      return { k: 'typeof', i: type.iri, p: [...type.pending] };
    case 'returnOf':
      return { k: 'returnOf', c: toJson(type.callee), a: type.args.map(toJson), p: [...type.pending] };
    case 'union':
    case 'intersection':
      return { k: type.kind, m: type.members.map(toJson) };
    case 'object':
      return {
        k: 'object',
        p: type.properties.map((property) => ({
          n: property.name,
          t: toJson(property.type),
          o: property.optional,
          r: property.readonly,
        })),
        x: type.indexes.map((index) => ({ k: toJson(index.key), t: toJson(index.type), r: index.readonly })),
      };
    case 'tuple':
      return {
        k: 'tuple',
        e: type.elements.map((element) => ({ t: toJson(element.type), o: element.optional, s: element.rest })),
        r: type.readonly,
      };
    case 'function':
      return {
        k: 'function',
        g: [...type.typeParams],
        p: type.params.map((entry) => ({ t: toJson(entry.type), o: entry.optional, s: entry.rest })),
        r: toJson(type.returns),
      };
    case 'param':
      return { k: 'param', n: type.name };
  }
};

const PRIMITIVES = new Set<string>([
  'string',
  'number',
  'boolean',
  'bigint',
  'symbol',
  'null',
  'undefined',
  'void',
  'never',
  'any',
  'unknown',
  'object',
]);

const PENDING = new Set<string>(['widen', 'settle', 'nonNullish', 'noUndefined']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const isPrimitiveName = (value: unknown): value is PrimitiveName => typeof value === 'string' && PRIMITIVES.has(value);

const isPending = (value: unknown): value is Pending => typeof value === 'string' && PENDING.has(value);

/** The inverse of {@link toJson}; anything malformed reads back as unresolved, never as a type. */
export const fromJson = (json: unknown): Type => {
  if (!isRecord(json)) {
    return unresolved('malformed');
  }
  const flag = (value: unknown) => value === true;
  switch (json.k) {
    case 'unresolved':
      return unresolved(typeof json.r === 'string' ? json.r : 'malformed');
    case 'primitive':
      return isPrimitiveName(json.n) ? primitive(json.n) : unresolved('malformed');
    case 'literal':
      if (typeof json.b === 'string') {
        return literal(BigInt(json.b), flag(json.f));
      }
      return typeof json.v === 'string' || typeof json.v === 'number' || typeof json.v === 'boolean'
        ? literal(json.v, flag(json.f))
        : unresolved('malformed');
    case 'ref':
      return typeof json.i === 'string' ? ref(json.i, list(json.a).map(fromJson)) : unresolved('malformed');
    case 'typeof':
      return typeof json.i === 'string' ? typeOf(json.i, list(json.p).filter(isPending)) : unresolved('malformed');
    case 'returnOf':
      return returnOf(fromJson(json.c), list(json.a).map(fromJson), list(json.p).filter(isPending));
    case 'union':
      return union(list(json.m).map(fromJson));
    case 'intersection':
      return intersection(list(json.m).map(fromJson));
    case 'object':
      return object(
        list(json.p)
          .filter(isRecord)
          .map((property) => ({
            name: String(property.n),
            type: fromJson(property.t),
            optional: flag(property.o),
            readonly: flag(property.r),
          })),
        list(json.x)
          .filter(isRecord)
          .map((index) => ({ key: fromJson(index.k), type: fromJson(index.t), readonly: flag(index.r) })),
      );
    case 'tuple':
      return tuple(
        list(json.e)
          .filter(isRecord)
          .map((element) => ({ type: fromJson(element.t), optional: flag(element.o), rest: flag(element.s) })),
        flag(json.r),
      );
    case 'function':
      return fn(
        list(json.p)
          .filter(isRecord)
          .map((entry) => ({ type: fromJson(entry.t), optional: flag(entry.o), rest: flag(entry.s) })),
        fromJson(json.r),
        list(json.g).filter((name): name is string => typeof name === 'string'),
      );
    case 'param':
      return typeof json.n === 'string' ? param(json.n) : unresolved('malformed');
    default:
      return unresolved('malformed');
  }
};
