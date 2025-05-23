//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { StateField, type Transaction, type Extension, type EditorState } from '@codemirror/state';
import { Facet } from '@codemirror/state';
import { type SyntaxNode } from '@lezer/common';

import { invariant } from '@dxos/invariant';

export type Range = {
  from: number;
  to: number;
};

/**
 * Represents a single item in the tree.
 */
export type Item = {
  type: 'root' | 'bullet' | 'task'; // TODO(burdon): Numbered?
  node: SyntaxNode;
  parent?: Item;
  nextSibling?: Item;
  prevSibling?: Item;
  children: Item[];
  /**
   * Actual range.
   * Starts at the start of the line containing the item and ends at the end of the line before the
   * first child or next sibling.
   */
  range: Range;
};

/**
 * Tree assumes the entire document is a single contiguous hierarchy of markdown LiteItem nodes.
 */
export class Tree implements Item {
  type: Item['type'] = 'root';
  node: Item['node'];
  range: Item['range'];
  children: Item['children'] = [];

  constructor(node: SyntaxNode) {
    this.node = node;
    this.range = { from: node.from, to: node.to };
  }

  traverse<T = any>(cb: (item: Item, level: number) => T | void): T | undefined {
    return traverse<T>(this, cb);
  }

  /**
   * Return the closest item.
   */
  find(pos: number): Item | undefined {
    return this.traverse((item) => (item.range.from <= pos && item.range.to >= pos ? item : undefined));
  }

  /**
   * Return the first child, next sibling, or parent's next sibling.
   */
  next(item: Item): Item | undefined {
    if (item.children.length > 0) {
      return item.children[0];
    }

    if (item.nextSibling) {
      return item.nextSibling;
    }

    if (item.parent) {
      return this.next(item.parent);
    }

    return undefined;
  }

  /**
   * Return the previous sibling, or parent.
   */
  prev(item: Item): Item | undefined {
    if (item.prevSibling) {
      return item.prevSibling;
    }

    return item.parent;
  }
}

/**
 * Traverse the tree, calling the callback for each item.
 * If the callback returns a value, the traversal is stopped and the value is returned.
 */
export const traverse = <T = any>(root: Item, cb: (item: Item, level: number) => T | void): T | undefined => {
  const t = (item: Item, level: number): T | undefined => {
    if (item.type !== 'root') {
      const value = cb(item, level);
      if (value != null) {
        return value;
      }
    }

    for (const child of item.children) {
      const value = t(child, level + 1);
      if (value != null) {
        return value;
      }
    }
  };

  return t(root, root.type === 'root' ? -1 : 0);
};

export const listItemToString = (item: Item, level = 0) =>
  `${'  '.repeat(level)}${item.type}(${item.range.from}:${item.range.to})`;

export const treeFacet = Facet.define<Tree, Tree>({
  combine: (values) => values[0],
});

/**
 * Creates a shadow tree of `ListItem` nodes whenever the document changes.
 * This adds overhead relative to the markdown AST, but allows for efficient traversal of the list items.
 */
export const outlinerTree = (): Extension => {
  const buildTree = (state: EditorState): Tree | undefined => {
    let tree: Tree | undefined;
    let parent: Item | undefined;
    let current: Item | undefined;
    let prevSibling: Item | undefined;
    syntaxTree(state).iterate({
      enter: (node) => {
        switch (node.name) {
          case 'BulletList':
            if (tree == null) {
              tree = new Tree(node.node);
              current = tree;
            }
            parent = current;
            prevSibling = undefined;
            if (current) {
              current.range.to = current.node.from;
            }
            break;
          case 'ListItem':
            current = {
              type: 'bullet',
              node: node.node,
              range: { from: state.doc.lineAt(node.from).from, to: node.to },
              parent,
              prevSibling,
              children: [],
            };
            invariant(parent);
            parent.children.push(current);
            if (parent.range.to === parent.node.from) {
              parent.range.to = current.range.from - 1;
            }
            if (prevSibling) {
              prevSibling.nextSibling = current;
            }
            prevSibling = current;
            break;
          case 'Task':
            invariant(current);
            current.type = 'task';
            break;
        }
      },
      leave: (node) => {
        switch (node.name) {
          case 'BulletList':
            parent = parent?.parent;
            break;
        }
      },
    });

    return tree;
  };

  return [
    StateField.define<Tree | undefined>({
      create: (state) => {
        return buildTree(state);
      },
      update: (value: Tree | undefined, tr: Transaction) => {
        // TODO(burdon): Filter specific changes?
        return tr.docChanged ? buildTree(tr.state) : value;
      },
      provide: (field) => treeFacet.from(field),
    }),
  ];
};
