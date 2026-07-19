//
// Copyright 2025 DXOS.org
//

import { type EditorState } from '@codemirror/state';
import { type SyntaxNode } from '@lezer/common';

import { invariant } from '@dxos/invariant';

export type Tag = Record<string, any> & {
  _tag: string;
};

/**
 * Parse XML Element.
 */
export const nodeToJson = (state: EditorState, node: SyntaxNode): Tag | undefined => {
  invariant(node.type.name === 'Element', 'Node is not an Element');

  // Find the opening tag.
  const openTag = node.node.getChild('OpenTag') || node.node.getChild('SelfClosingTag');
  if (openTag) {
    // Extract tag name.
    const tagName = openTag.getChild('TagName');
    if (!tagName) {
      return;
    }

    const tag: Tag = {
      _tag: state.doc.sliceString(tagName.from, tagName.to),
    };

    // Extract attributes.
    let attributeNode = openTag.getChild('Attribute');
    while (attributeNode) {
      const attrName = attributeNode.getChild('AttributeName');
      if (attrName) {
        const attr = state.doc.sliceString(attrName.from, attrName.to);

        // Default for attributes without values.
        let value: any = undefined;
        const attrValue = attributeNode.getChild('AttributeValue');
        if (attrValue) {
          const rawValue = state.doc.sliceString(attrValue.from, attrValue.to);
          if (
            (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
            (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ) {
            // Remove quotes if present.
            value = rawValue.slice(1, -1);
          } else {
            value = rawValue;
          }
        }

        tag[attr] = value;
      }

      // Get next sibling attribute.
      attributeNode = attributeNode.nextSibling;
    }

    // Extract children for non-self-closing tags.
    if (node.type.name === 'Element' && openTag.type.name !== 'SelfClosingTag') {
      const children: any[] = [];
      let child = node.node.firstChild;

      const appendText = (raw: string) => {
        if (raw.length === 0) {
          return;
        }
        const last = children[children.length - 1];
        if (typeof last === 'string') {
          children[children.length - 1] = last + raw;
        } else {
          children.push(raw);
        }
      };

      while (child) {
        // Skip the opening and closing tags.
        if (child.type.name !== 'OpenTag' && child.type.name !== 'CloseTag') {
          if (child.type.name === 'Text') {
            appendText(state.doc.sliceString(child.from, child.to));
          } else if (child.type.name === 'EntityReference' || child.type.name === 'CharacterReference') {
            appendText(decodeXmlEntity(state.doc.sliceString(child.from, child.to)));
          } else if (child.type.name === 'Element') {
            const data = nodeToJson(state, child);
            if (data) {
              children.push(data);
            }
          }
        }
        child = child.nextSibling;
      }

      // Trim only leading/trailing whitespace on the outer-boundary string segments —
      // interior strings are preserved verbatim so meaningful whitespace around inline
      // child elements (e.g. `<reasoning>foo <ref/> bar</reasoning>`) is not collapsed.
      if (children.length > 0 && typeof children[0] === 'string') {
        children[0] = children[0].trimStart();
      }
      if (children.length > 0) {
        const lastIndex = children.length - 1;
        const last = children[lastIndex];
        if (typeof last === 'string') {
          children[lastIndex] = last.trimEnd();
        }
      }
      const trimmed = children.filter((value) => typeof value !== 'string' || value.length > 0);

      if (trimmed.length > 0) {
        tag.children = trimmed;
      }
    }

    return tag;
  }
};

/**
 * Decode the common XML named entities and numeric character references that
 * Lezer XML produces as `EntityReference` / `CharacterReference` nodes.
 */
const XML_NAMED_ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': "'",
};

const decodeXmlEntity = (raw: string): string => {
  const named = XML_NAMED_ENTITIES[raw];
  if (named !== undefined) {
    return named;
  }
  const numeric = /^&#(x?)([0-9a-fA-F]+);$/.exec(raw);
  if (numeric) {
    const code = parseInt(numeric[2], numeric[1] ? 16 : 10);
    if (Number.isFinite(code)) {
      try {
        return String.fromCodePoint(code);
      } catch {
        // Fall through and return the raw text on out-of-range code points.
      }
    }
  }
  return raw;
};
