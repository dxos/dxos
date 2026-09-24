//
// Copyright 2026 DXOS.org
//

//
// Text parts of a node: the pieces a node type renders as text and lets the user edit in place. A
// part is named by the node property it edits; list properties read and write as one entry per line.
//

import { type Node, type NodeValues, isClassNode, isEllipseNode, isNoteNode, isRectNode } from '../model/types.ts';

export type PartKey = 'label' | 'text' | 'name' | 'attributes' | 'methods';

/** A part edited in place: which one, and how the editor hands its result back. */
export type PartEditing = {
  part: PartKey;
  commit: (text: string) => void;
  cancel: () => void;
};

const PARTS: readonly PartKey[] = ['label', 'text', 'name', 'attributes', 'methods'];

/** The part a `data-part` attribute names, if it names one. */
export const partKey = (value: string | null | undefined): PartKey | undefined => PARTS.find((part) => part === value);

const LINES: readonly PartKey[] = ['text', 'attributes', 'methods'];

/** Enter inserts a line in a multi-line part; Mod-Enter commits. */
export const isMultiline = (part: PartKey): boolean => LINES.includes(part);

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/** The part's text, or none when the node type has no such part. */
export const partText = (node: Node, part: PartKey): string | undefined => {
  switch (part) {
    case 'label':
      return isRectNode(node) || isEllipseNode(node) ? (node.label ?? '') : undefined;
    case 'text':
      return isNoteNode(node) ? node.text : undefined;
    case 'name':
      return isClassNode(node) ? node.name : undefined;
    case 'attributes':
      return isClassNode(node) ? node.attributes.join('\n') : undefined;
    case 'methods':
      return isClassNode(node) ? node.methods.join('\n') : undefined;
  }
};

/** The `update` values that set the part's text, or none when the node type has no such part. */
export const partValues = (node: Node, part: PartKey, text: string): NodeValues | undefined => {
  switch (part) {
    case 'label':
      return isRectNode(node) || isEllipseNode(node) ? { label: text } : undefined;
    case 'text':
      return isNoteNode(node) ? { text } : undefined;
    case 'name':
      return isClassNode(node) ? { name: text.trim() } : undefined;
    case 'attributes':
      return isClassNode(node) ? { attributes: lines(text) } : undefined;
    case 'methods':
      return isClassNode(node) ? { methods: lines(text) } : undefined;
  }
};
