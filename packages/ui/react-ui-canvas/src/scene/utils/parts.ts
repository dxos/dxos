//
// Copyright 2026 DXOS.org
//

//
// Text parts of a node: the pieces a node type renders as text and lets the user edit in place. A
// part is named by the node property it edits; list properties read and write as one entry per line.
//

import { type Node } from '../model/types.ts';

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
      return node.type === 'rect' || node.type === 'ellipse' ? (node.label ?? '') : undefined;
    case 'text':
      return node.type === 'text' ? node.text : undefined;
    case 'name':
      return node.type === 'class' ? node.name : undefined;
    case 'attributes':
      return node.type === 'class' ? node.attributes.join('\n') : undefined;
    case 'methods':
      return node.type === 'class' ? node.methods.join('\n') : undefined;
  }
};

/** The `update` values that set the part's text, or none when the node type has no such part. */
export const partValues = (node: Node, part: PartKey, text: string): Partial<Node> | undefined => {
  switch (part) {
    case 'label':
      return node.type === 'rect' || node.type === 'ellipse' ? { label: text } : undefined;
    case 'text':
      return node.type === 'text' ? { text } : undefined;
    case 'name':
      return node.type === 'class' ? { name: text.trim() } : undefined;
    case 'attributes':
      return node.type === 'class' ? { attributes: lines(text) } : undefined;
    case 'methods':
      return node.type === 'class' ? { methods: lines(text) } : undefined;
  }
};
