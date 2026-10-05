//
// Copyright 2026 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { type SyntaxNode } from '@lezer/common';

import {
  type AttrSpec,
  DIAGRAM_ATTRS,
  EDGE_ATTRS,
  ELEMENT_ATTRS,
  ELEMENT_KINDS,
  type ElementKind,
  GROUP_ATTRS,
  NODE_ATTRS,
  OBJECT_ATTRS,
  RELATION_WORDS,
  STATEMENT_KEYWORDS,
} from '../dsl/vocabulary.ts';

/** What a semantic statement accepts after its id: attributes, plus relations or edge clauses. */
const SEMANTIC: Record<string, { attrs: readonly AttrSpec[]; words: readonly string[] }> = {
  DiagramDecl: { attrs: DIAGRAM_ATTRS, words: [] },
  GroupDecl: { attrs: GROUP_ATTRS, words: RELATION_WORDS },
  NodeDecl: { attrs: NODE_ATTRS, words: RELATION_WORDS },
  EdgeDecl: { attrs: EDGE_ATTRS, words: ['via', 'bus'] },
};

const attributeOptions = (attrs: readonly AttrSpec[]) =>
  attrs.map(({ name, type }) => ({
    label: name,
    type: 'property',
    detail: type === 'enum' ? undefined : type,
    apply: `${name}=`,
  }));

/** The element kind a completion is inside, read off the tree rather than re-lexing the line. */
const enclosingKind = (context: CompletionContext, pos: number): ElementKind | undefined => {
  let node = syntaxTree(context.state).resolveInner(pos, -1);
  while (node.parent) {
    if (node.name === 'Element') {
      const shape = node.firstChild;
      const keyword = shape && (shape.getChild('BoxKind') ?? shape.getChild('PathKind'))?.firstChild;
      const word = context.state.doc.sliceString(
        (keyword ?? shape?.firstChild)?.from ?? 0,
        (keyword ?? shape?.firstChild)?.to ?? 0,
      );
      return ELEMENT_KINDS.find((kind) => kind === word);
    }
    if (node.name === 'ObjectDecl' || node.name === 'ElementsDecl') {
      // Inside the declaration but outside any element: the object's own attributes.
      return undefined;
    }
    node = node.parent;
  }
  return undefined;
};

/** Node names from the cursor out to the document, so a position is classified by where it sits. */
const ancestorsOf = (context: CompletionContext, pos: number): string[] => {
  const names: string[] = [];
  for (let node: SyntaxNode | null = syntaxTree(context.state).resolveInner(pos, -1); node; node = node.parent) {
    names.push(node.name);
  }
  return names;
};

const source = (context: CompletionContext): CompletionResult | null => {
  const word = context.matchBefore(/[\w-]*/);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }

  const ancestors = ancestorsOf(context, context.pos);
  // Inside a semantic statement the innermost one decides; a group's body holds nodes and edges.
  const innermost = ancestors.find((name) => name in SEMANTIC || name === 'GroupBody');
  if (innermost === 'GroupBody') {
    return { from: word.from, options: ['node', 'edge'].map((label) => ({ label, type: 'keyword' })) };
  }
  if (innermost) {
    const { attrs, words } = SEMANTIC[innermost];
    return {
      from: word.from,
      options: [...words.map((label) => ({ label, type: 'keyword' })), ...attributeOptions(attrs)],
    };
  }
  // Outside any declaration only a statement can start.
  if (!ancestors.includes('ObjectDecl') && !ancestors.includes('ElementsDecl')) {
    return { from: word.from, options: STATEMENT_KEYWORDS.map((label) => ({ label, type: 'keyword' })) };
  }

  // A `Body` holds elements and nothing else, so an empty position in one wants a kind; inside an
  // element it wants that kind's attributes, and in the header it wants the object's.
  const kind = enclosingKind(context, context.pos);
  if (!kind && ancestors.includes('Body')) {
    return { from: word.from, options: ELEMENT_KINDS.map((label) => ({ label, type: 'keyword' })) };
  }

  return { from: word.from, options: attributeOptions(kind ? ELEMENT_ATTRS[kind] : OBJECT_ATTRS) };
};

export const diagramComplete: Extension = autocompletion({ override: [source] });
