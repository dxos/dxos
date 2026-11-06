//
// Copyright 2026 DXOS.org
//

/** How a map groups a block kind. */
export type BlockRole = 'anchor' | 'structure' | 'verification' | 'context';

export const BLOCK_ROLES: readonly BlockRole[] = ['anchor', 'structure', 'verification', 'context'];

/** The type of one field of a block, read from its `ext` declaration. */
export type FieldType =
  | { kind: 'prose' }
  | { kind: 'identifier' }
  | { kind: 'uri' }
  | { kind: 'boolean' }
  | { kind: 'number' }
  /** `a | b | c`. */
  | { kind: 'literal'; options: readonly string[] }
  /** `Ref<op>`, `Ref<spec>`, `TypeRef`, `OpRefList`; `to` is empty for a reference to any kind. */
  | { kind: 'ref'; to: readonly string[]; many: boolean }
  /** A type expression, which names `type` blocks. */
  | { kind: 'typeExpr' }
  /** Rows of `name[?]: value  # note`: a `FieldMap` (typed values) or an entry map (`ErrorMap`, prose values). */
  | { kind: 'map'; value: 'type' | 'prose' }
  /** Keyed lines named after the field: `req <key>: prose`. */
  | { kind: 'keyed' }
  /** `ProseList`, `Step[]`, `TagList`: one item per `- ` line, or a flow list. */
  | { kind: 'list' }
  | { kind: 'code' }
  /** A type no codec reads; its source is edited as text. */
  | { kind: 'raw' };

export type FieldSchema = {
  name: string;
  optional: boolean;
  type: FieldType;
  /** The declared type expression, as written. */
  expr: string;
  /** The declaration's trailing comment. */
  doc?: string;
};

/** One block kind: what its `ext` declaration says, resolved through `extends`. */
export type BlockSchema = {
  kind: string;
  uri: string;
  /** The id of the dialect that declares it, or `''` for a spec's own appendix. */
  dialect: string;
  desc: string;
  role: BlockRole;
  /** A numbered kind's label prefix (`F`): its ids are keys and its labels positional. */
  label?: string;
  hue?: string;
  icon?: string;
  inlineProse: boolean;
  fields: readonly FieldSchema[];
};

/** Whether a field points at other blocks or specs. A type expression names `type` blocks. */
export const isReferenceField = (field: FieldSchema): boolean =>
  field.type.kind === 'ref' ||
  field.type.kind === 'typeExpr' ||
  (field.type.kind === 'map' && field.type.value === 'type');

/** Whether a reference field points at specs rather than blocks. */
export const isSpecReference = (field: FieldSchema): boolean =>
  field.type.kind === 'ref' && field.type.to.length === 1 && field.type.to[0] === 'spec';
