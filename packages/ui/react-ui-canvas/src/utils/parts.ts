//
// Copyright 2026 DXOS.org
//

//
// Text parts of a node: the properties a node type renders as text and lets the user edit in place. Each
// type declares its parts in its registry definition, so a type a host adds edits the same way as a built-in
// one. A part is named by the property it edits; a `lines` part reads and writes a list one entry per line. A
// plugin kind keeps its own fields under the node's `data`, so a part or a bind names one as `data.<field>`.
//

import { type Node } from '@dxos/scene';

import { type NodeRegistry, type NodeValues, nodeDef, readPath, writePath } from '../model/index.ts';

/** A part's name: the node property it edits, a kind's own as `data.<field>`. */
export type PartKey = string;

const pathOf = (field: PartKey): string[] => field.split('.');

/** The value of a node's field by name. */
export const fieldValue = (node: object, field: PartKey): unknown => readPath(node, pathOf(field));

/** The `update` values that set a node's field: one under `data` is written beside the rest of the node's `data`. */
export const fieldValues = (node: object, field: PartKey, value: unknown): NodeValues => {
  const [head, ...rest] = pathOf(field);
  return { [head]: writePath(Reflect.get(node, head), rest, value) };
};

/** The field's own name, without where the node keeps it. */
export const fieldName = (field: PartKey): string => pathOf(field).at(-1) ?? field;

/** A text property of a node type, as its definition declares it. */
export type PartField = {
  /** The node property the part edits. */
  field: PartKey;
  /** A list of strings, one per line; implies `multiline`. */
  lines?: boolean;
  /** Enter breaks the line and Mod-Enter commits, rather than Enter committing. */
  multiline?: boolean;
};

/** A part edited in place: which one, and how the editor hands its result back. */
export type PartEditing = {
  part: PartKey;
  multiline: boolean;
  commit: (text: string) => void;
  cancel: () => void;
};

const toLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/** The core base's one part: the label a node of an unknown type is edited by (see `BaseNode`). */
const BASE_PARTS: readonly PartField[] = [{ field: 'label' }];

/** The parts a node's type declares; a type the registry does not know has the core base's label. */
export const nodeParts = (registry: NodeRegistry, node: Node): readonly PartField[] => {
  const def = nodeDef(registry, node);
  return def ? (def.parts ?? []) : BASE_PARTS;
};

const partOf = (registry: NodeRegistry, node: Node, part: PartKey): PartField | undefined =>
  nodeParts(registry, node).find(({ field }) => field === part);

/** Whether the part takes several lines. */
export const isMultiline = (part: PartField): boolean => part.lines === true || part.multiline === true;

/** The part's text, or none when the node's type has no such part. */
export const partText = (registry: NodeRegistry, node: Node, part: PartKey): string | undefined => {
  const field = partOf(registry, node, part);
  if (!field) {
    return undefined;
  }
  const value = fieldValue(node, field.field);
  if (field.lines) {
    return Array.isArray(value) ? value.filter((line) => typeof line === 'string').join('\n') : '';
  }
  return typeof value === 'string' ? value : '';
};

/** The `update` values that set the part's text, or none when the node's type has no such part. */
export const partValues = (registry: NodeRegistry, node: Node, part: PartKey, text: string): NodeValues | undefined => {
  const field = partOf(registry, node, part);
  if (!field) {
    return undefined;
  }
  return fieldValues(node, field.field, field.lines ? toLines(text) : text);
};

/** A node's main text: its first part's, which a diagram or a DSL export shows as the node's name. */
export const nodeTitle = (registry: NodeRegistry, node: Node): string | undefined => {
  const [first] = nodeParts(registry, node);
  return first ? partText(registry, node, first.field) : undefined;
};

/** The node with its main text (its first part) set; a type without parts is returned as is. */
export const withTitle = <N extends Node>(registry: NodeRegistry, node: N, text: string): N => {
  const [first] = nodeParts(registry, node);
  return first ? { ...node, ...partValues(registry, node, first.field, text) } : node;
};
