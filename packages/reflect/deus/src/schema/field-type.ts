//
// Copyright 2026 DXOS.org
//

import { type FieldType } from './types.ts';

const SCALARS: Record<string, FieldType> = {
  Boolean: { kind: 'boolean' },
  CodeBlock: { kind: 'code' },
  Date: { kind: 'identifier' },
  Expr: { kind: 'identifier' },
  Identifier: { kind: 'identifier' },
  NSID: { kind: 'identifier' },
  Number: { kind: 'number' },
  Prose: { kind: 'prose' },
  RequirementList: { kind: 'keyed' },
  SemVer: { kind: 'identifier' },
  TypeExpr: { kind: 'typeExpr' },
  UnionList: { kind: 'typeExpr' },
  URI: { kind: 'uri' },
  boolean: { kind: 'boolean' },
  number: { kind: 'number' },
};

/** Maps whose values are type expressions; every other `*Map` holds prose values. */
const TYPED_MAPS = new Set(['ApiMap', 'FieldMap']);

/** A literal option: a lowercase word, possibly with `-` or `:` (`in-progress`, `echo:read`). */
const LITERAL = /^[a-z][\w:-]*$/;

/** The kind a `<Name>Ref` alias points at: `TypeRef` is `type`, `PlankRef` is `plank`. */
const aliasKind = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

/**
 * The type a field declaration's expression names. Unknown names are `raw`, so a field of a type no
 * codec reads is still editable as text.
 */
export const parseFieldType = (expr: string): FieldType => {
  const source = expr.trim();
  const ref = source.match(/^Ref<\s*([\w|\s-]+?)\s*>(\[\])?$/);
  if (ref) {
    return { kind: 'ref', to: ref[1].split('|').map((kind) => kind.trim()), many: Boolean(ref[2]) };
  }
  if (source === 'RefList' || source === 'Ref[]') {
    return { kind: 'ref', to: [], many: true };
  }
  const alias = source.match(/^(\w+)Ref(List|Chain|\[\])?$/);
  if (alias) {
    const to = [alias[1] === 'Ext' ? 'ext' : aliasKind(alias[1])];
    // `PlankRefChain`: an ordered list written `A > B`.
    return { kind: 'ref', to, many: Boolean(alias[2]), ...(alias[2] === 'Chain' && { chain: true }) };
  }
  const list = source.match(/^(\w+)List$/);
  if (source === 'ServiceList') {
    return { kind: 'ref', to: ['service'], many: true };
  }
  if (SCALARS[source]) {
    return SCALARS[source];
  }
  if (/^\w+Map$/.test(source)) {
    return { kind: 'map', value: TYPED_MAPS.has(source) ? 'type' : 'prose' };
  }
  if (list || /^\w+\[\]$/.test(source)) {
    return { kind: 'list' };
  }
  if (source.includes('|')) {
    const options = source.split('|').map((option) => option.trim());
    // `NodeRef | TypeRef`: one block of any of the kinds.
    const refs = options.map(parseFieldType);
    if (refs.every((ref) => ref.kind === 'ref' && !ref.many)) {
      return { kind: 'ref', to: refs.flatMap((ref) => (ref.kind === 'ref' ? ref.to : [])), many: false };
    }
    if (options.every((option) => LITERAL.test(option))) {
      return { kind: 'literal', options };
    }
    // `Step | Step[]` and the like: one item or several.
    if (options.some((option) => option.endsWith('[]'))) {
      return { kind: 'list' };
    }
  }
  return { kind: 'raw' };
};
