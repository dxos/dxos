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
  type: 'root' | 'bullet' | 'task' | 'unknown'; // TODO(burdon): Numbered?
  node: SyntaxNode;
  level: number;
  parent?: Item;
  nextSibling?: Item;
  prevSibling?: Item;
  children: Item[];
  /**
   * Actual range.
   * Starts at the start of the line containing the item and ends at the end of the line before the
   * first child or next sibling.
   */
  lineRange: Range;
  /**
   * Range of the editable content.
   * This doesn't include the list or task marker or indentation.
   */
  contentRange: Range;
};

/**
 * Tree assumes the entire document is a single contiguous well-formed hierarchy of markdown LiteItem nodes.
 */
// TOOD(burdon): Cancel any mutation that breaks the tree?
export class Tree implements Item {
  type: Item['type'] = 'root';
  node: Item['node'];
  level: number = -1;
  lineRange: Item['lineRange'];
  contentRange: Item['contentRange'];
  children: Item['children'] = [];

  constructor(node: SyntaxNode) {
    this.node = node;
    this.lineRange = { from: node.from, to: node.to };
    this.contentRange = this.lineRange;
  }

  get root(): Item {
    return this;
  }

  traverse<T = any>(cb: (item: Item, level: number) => T | void): T | undefined;
  traverse<T = any>(item: Item, cb: (item: Item, level: number) => T | void): T | undefined;
  traverse<T = any>(
    itemOrCb: Item | ((item: Item, level: number) => T | void),
    maybeCb?: (item: Item, level: number) => T | void,
  ): T | undefined {
    if (typeof itemOrCb === 'function') {
      return traverse<T>(this, itemOrCb);
    } else {
      return traverse<T>(itemOrCb, maybeCb!);
    }
  }

  /**
   * Return the closest item.
   */
  find(pos: number): Item | undefined {
    return this.traverse((item) => (item.lineRange.from <= pos && item.lineRange.to >= pos ? item : undefined));
  }

  /**
   * Return the first child, next sibling, or parent's next sibling.
   */
  next(item: Item, enter = true): Item | undefined {
    if (enter && item.children.length > 0) {
      return item.children[0];
    }

    if (item.nextSibling) {
      return item.nextSibling;
    }

    if (item.parent) {
      return this.next(item.parent, false);
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

    return item.parent?.type === 'root' ? undefined : item.parent;
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

export const getListItemContent = (state: EditorState, item: Item): string => {
  return state.doc.sliceString(item.contentRange.from, item.contentRange.to);
};

export const listItemToString = (item: Item, level = 0) => {
  const indent = '  '.repeat(level);
  const data = {
    level: item.level,
    node: [item.node.from, item.node.to],
    doc: [item.lineRange.from, item.lineRange.to],
    content: [item.contentRange.from, item.contentRange.to],
  };

  return `${indent}${item.type}(${Object.entries(data)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(', ')})`;
};

export const treeFacet = Facet.define<Tree, Tree>({
  combine: (values) => values[0],
});

export type TreeOptions = {
  debug?: boolean;
};

/**
 * Creates a shadow tree of `ListItem` nodes whenever the document changes.
 * This adds overhead relative to the markdown AST, but allows for efficient traversal of the list items.
 */
export const outlinerTree = ({ debug = false }: TreeOptions = {}): Extension => {
  const buildTree = (state: EditorState): Tree => {
    let tree: Tree | undefined;
    let parent: Item | undefined;
    let current: Item | undefined;
    let prevSibling: Item | undefined;
    syntaxTree(state).iterate({
      enter: (node) => {
        switch (node.name) {
          case 'Document': {
            tree = new Tree(node.node);
            current = tree;
            break;
          }
          case 'BulletList': {
            parent = current;
            prevSibling = undefined;
            if (current) {
              current.lineRange.to = current.node.from;
            }
            break;
          }
          case 'ListItem': {
            invariant(parent);
            const nextSibling = node.node.nextSibling;
            const docRange: Range = {
              from: state.doc.lineAt(node.from).from,
              // Include all content up to the next sibling or the end of the document.
              to: nextSibling ? nextSibling.from - 1 : state.doc.length,
            };
            current = {
              type: 'unknown',
              node: node.node,
              level: parent.level + 1,
              lineRange: docRange,
              contentRange: { ...docRange },
              parent,
              prevSibling,
              children: [],
            };
            parent.children.push(current);
            if (parent.lineRange.to === parent.node.from) {
              parent.lineRange.to = current.lineRange.from - 1;
              parent.contentRange.to = parent.lineRange.to;
            }
            if (prevSibling) {
              prevSibling.nextSibling = current;
            }
            prevSibling = current;
            break;
          }
          case 'ListMark': {
            invariant(current);
            current.type = 'bullet';
            current.contentRange.from = node.from + '- '.length;
            break;
          }
          case 'Task': {
            invariant(current);
            current.type = 'task';
            break;
          }
          case 'TaskMarker': {
            invariant(current);
            current.contentRange.from = node.from + '[ ] '.length;
            break;
          }
        }
      },
      leave: (node) => {
        if (node.name === 'BulletList') {
          parent = parent?.parent;
        }
      },
    });

    invariant(tree);
    return tree;
  };

  return [
    StateField.define<Tree | undefined>({
      create: (state) => {
        return buildTree(state);
      },
      update: (value: Tree | undefined, tr: Transaction) => {
        // TODO(burdon): Filter specific changes?
        if (!tr.docChanged) {
          return value;
        }

        const tree = buildTree(tr.state);
        if (debug) {
          tree?.traverse((item) => {
            // eslint-disable-next-line no-console
            console.log(listItemToString(item));
          });
        }
        return tree;
      },
      provide: (field) => treeFacet.from(field),
    }),
  ];
};
