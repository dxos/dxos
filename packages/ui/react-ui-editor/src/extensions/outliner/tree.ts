//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, StateField, type Transaction } from '@codemirror/state';
import { Facet } from '@codemirror/state';
import { type SyntaxNode } from '@lezer/common';

import { invariant } from '@dxos/invariant';

import { type Range } from '../../types';

/**
 * Represents a single item in the tree.
 */
export interface Item {
  type: 'root' | 'bullet' | 'task' | 'unknown';
  index: number;
  level: number;
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
  lineRange: Range;
  /**
   * Range of the editable content.
   * This doesn't include the list or task marker or indentation.
   */
  contentRange: Range;
}

export const itemToJSON = ({ type, index, level, lineRange, contentRange, children }: Item): any => ({
  type,
  index,
  level,
  lineRange,
  contentRange,
  children: children.map(itemToJSON),
});

/**
 * Tree assumes the entire document is a single contiguous well-formed hierarchy of markdown LiteItem nodes.
 */
export class Tree implements Item {
  type: Item['type'] = 'root';
  index = -1;
  level = -1;
  node: Item['node'];
  lineRange: Item['lineRange'];
  contentRange: Item['contentRange'];
  children: Item['children'] = [];

  constructor(node: SyntaxNode) {
    this.node = node;
    this.lineRange = { from: node.from, to: node.to };
    this.contentRange = this.lineRange;
  }

  toJSON() {
    return itemToJSON(this);
  }

  get root(): Item {
    return this;
  }

  traverse<T = any>(cb: (item: Item, level: number) => T | void): T | undefined;
  traverse<T = any>(item: Item, cb: (item: Item, level: number) => T | void): T | undefined;
  traverse<T = any>(
    itemOrCb: Item | ((item: Item, level: number) => T | undefined | void),
    maybeCb?: (item: Item, level: number) => T | undefined | void,
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
    return this.traverse<Item>((item) => (item.lineRange.from <= pos && item.lineRange.to >= pos ? item : undefined));
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
      return this.lastDescendant(item.prevSibling);
    }

    return item.parent?.type === 'root' ? undefined : item.parent;
  }

  /**
   * Return the last descendant of the item, or the item itself if it has no children.
   */
  lastDescendant(item: Item): Item {
    return item.children.length > 0 ? this.lastDescendant(item.children.at(-1)!) : item;
  }
}

export const getRange = (tree: Tree, item: Item): [number, number] => {
  const lastDescendant = tree.lastDescendant(item);
  return [item.lineRange.from, lastDescendant.lineRange.to];
};

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

    return undefined;
  };

  return t(root, root.type === 'root' ? -1 : 0);
};

export const getListItemContent = (state: EditorState, item: Item): string =>
  state.doc.sliceString(item.contentRange.from, item.contentRange.to);

export const listItemToString = (item: Item, level = 0) => {
  const indent = '  '.repeat(level);
  const data = {
    i: item.index,
    n: item.nextSibling?.index ?? '∅',
    p: item.prevSibling?.index ?? '∅',
    level: item.level,
    node: format([item.node.from, item.node.to]),
    line: format([item.lineRange.from, item.lineRange.to]),
    content: format([item.contentRange.from, item.contentRange.to]),
  };

  return `${indent}${item.type[0].toUpperCase()}(${Object.entries(data)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')})`;
};

const format = (value: any) =>
  JSON.stringify(value, (key: string, value: any) => {
    if (typeof value === 'number') {
      return value.toString().padStart(3, ' ');
    }
    return value;
  }).replaceAll('"', '');

export const treeFacet = Facet.define<Tree, Tree>({
  combine: (values) => values[0],
});

export type TreeOptions = {};

/**
 * Creates a shadow tree of `ListItem` nodes whenever the document changes.
 * This adds overhead relative to the markdown AST, but allows for efficient traversal of the list items.
 * NOTE: Requires markdown parser to be enabled.
 */
export const outlinerTree = (_options: TreeOptions = {}): Extension => {
  const buildTree = (state: EditorState): Tree => {
    let tree: Tree | undefined;
    let parent: Item | undefined;
    let current: Item | undefined;
    let prev: Item | undefined;
    let level = -1;
    let index = -1;

    // Array to track previous siblings at each level.
    const prevSiblings: (Item | undefined)[] = [];

    syntaxTree(state).iterate({
      enter: (node) => {
        switch (node.name) {
          case 'Document': {
            tree = new Tree(node.node);
            current = tree;
            break;
          }
          case 'BulletList': {
            invariant(current);
            parent = current;
            if (current) {
              current.lineRange.to = current.node.from;
            }
            prevSiblings[++level] = undefined;
            break;
          }
          case 'ListItem': {
            invariant(parent);

            // Include all content up to the next sibling or the end of the document.
            const nextSibling = node.node.nextSibling ?? node.node.parent?.nextSibling;
            const docRange: Range = {
              from: state.doc.lineAt(node.from).from,
              to: nextSibling ? nextSibling.from - 1 : state.doc.length,
            };

            current = {
              type: 'unknown',
              index: ++index,
              level,
              node: node.node,
              lineRange: docRange,
              contentRange: { ...docRange },
              parent,
              prevSibling: prevSiblings[level],
              children: [],
            };

            // Update sibling refs.
            if (current.prevSibling) {
              current.prevSibling.nextSibling = current;
            }

            // Update previous siblings array at current level.
            prevSiblings[level] = current;

            // Update previous item (not sibling).
            if (prev) {
              prev.lineRange.to = prev.contentRange.to = current.lineRange.from - 1;
            }
            prev = current;

            // Update parent.
            parent.children.push(current);
            if (parent.lineRange.to === parent.node.from) {
              parent.lineRange.to = parent.contentRange.to = current.lineRange.from - 1;
            }

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
          invariant(parent);
          prevSiblings[level--] = undefined;
          parent = parent.parent;
        }
      },
    });

    invariant(tree);
    return tree;
  };

  return [
    StateField.define<Tree | undefined>({
      create: (state) => buildTree(state),
      update: (value: Tree | undefined, tr: Transaction) => {
        if (!tr.docChanged) {
          return value;
        }

        return buildTree(tr.state);
      },
      provide: (field) => treeFacet.from(field),
    }),
  ];
};
