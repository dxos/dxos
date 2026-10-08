//
// Copyright 2026 DXOS.org
//

//
// Text parts of a node: the properties a node type renders as text and lets the user edit in place. Each
// type declares its parts in its registry definition, so a type a host adds edits the same way as a built-in
// one. A part is named by the property it edits; a `lines` part reads and writes a list one entry per line.
//

import { nodeDef } from '../model/node-def.ts';
import { type NodeRegistry } from '../model/registry.ts';
import { type Node, type NodeValues } from '../model/types.ts';

/** A part's name: the node property it edits. */
export type PartKey = string;

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

/** The parts a node's type declares; none for a type the registry does not know. */
export const nodeParts = (registry: NodeRegistry, node: Node): readonly PartField[] =>
  nodeDef(registry, node)?.parts ?? [];

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
  const value: unknown = Reflect.get(node, field.field);
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
  return { [field.field]: field.lines ? toLines(text) : text };
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
