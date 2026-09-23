//
// Copyright 2026 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { type Extension } from '@codemirror/state';

import { ELEMENT_ATTRS, ELEMENT_KINDS, type ElementKind, OBJECT_ATTRS, STATEMENT_KEYWORDS } from '../dsl/vocabulary.ts';

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

const source = (context: CompletionContext): CompletionResult | null => {
  const word = context.matchBefore(/[\w-]*/);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }

  const inBody = syntaxTree(context.state).resolveInner(context.pos, -1).name !== 'Document';
  if (!inBody) {
    return {
      from: word.from,
      options: STATEMENT_KEYWORDS.map((label) => ({ label, type: 'keyword' })),
    };
  }

  const kind = enclosingKind(context, context.pos);
  const attrs = kind ? ELEMENT_ATTRS[kind] : OBJECT_ATTRS;
  return {
    from: word.from,
    options: [
      ...attrs.map(({ name, type }) => ({
        label: name,
        type: 'property',
        detail: type === 'enum' ? undefined : type,
        apply: `${name}=`,
      })),
      // Only an element body takes a new element, and only there is the kind list useful.
      ...(kind ? ELEMENT_KINDS.map((label) => ({ label, type: 'keyword' })) : []),
    ],
  };
};

export const diagramComplete: Extension = autocompletion({ override: [source] });
