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

      while (child) {
        // Skip the opening and closing tags.
        if (child.type.name !== 'OpenTag' && child.type.name !== 'CloseTag') {
          if (child.type.name === 'Text') {
            const text = state.doc.sliceString(child.from, child.to).trim();
            if (text) {
              children.push(text);
            }
          } else if (child.type.name === 'Element') {
            const data = nodeToJson(state, child);
            if (data) {
              children.push(data);
            }
          }
        }
        child = child.nextSibling;
      }

      if (children.length > 0) {
        tag.children = children;
      }
    }

    return tag;
  }
};
