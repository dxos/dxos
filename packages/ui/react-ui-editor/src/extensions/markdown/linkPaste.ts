//
// Copyright 2024 DXOS.org
//
import { syntaxTree } from '@codemirror/language';
import { type EditorState, Transaction } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate, type PluginValue } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

const VALID_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

const createTextLink = (text: string, url: string): string => `[${text}](${url})`;

const createUrlLink = (url: string): string => {
  const displayUrl = formatUrlForDisplay(url);
  return `[${displayUrl}](${url})`;
};

const formatUrlForDisplay = (url: string): string => {
  const withoutProtocol = url.replace(/^https?:\/\//, '');
  return truncateQueryParams(withoutProtocol);
};

const truncateQueryParams = (url: string, maxQueryLength: number = 15): string => {
  const [urlBase, queryString] = url.split('?');
  if (!queryString) {
    return urlBase;
  }
  if (queryString.length > maxQueryLength) {
    const truncatedQuery = queryString.slice(0, maxQueryLength) + '...';
    return `${urlBase}?${truncatedQuery}`;
  } else {
    return `${urlBase}?${queryString}`;
  }
};

const isValidUrl = (str: string) => {
  try {
    const url = new URL(str);
    return VALID_PROTOCOLS.includes(url.protocol);
  } catch (e) {
    return false;
  }
};

const onNextUpdate = (callback: () => void) => setTimeout(callback, 0);

export const linkPastePlugin = ViewPlugin.fromClass(
  class implements PluginValue {
    view: EditorView;

    constructor(view: EditorView) {
      this.view = view;
    }

    update(update: ViewUpdate) {
      for (const tr of update.transactions) {
        const event = tr.annotation(Transaction.userEvent);
        if (event === 'input.paste') {
          this.handleInputRead(this.view, tr);
        }
      }
    }

    handleInputRead(view: EditorView, tr: Transaction) {
      const changes = tr.changes;
      if (changes.empty) {
        return;
      }
      changes.iterChangedRanges((fromA, toA, fromB, toB) => {
        const insertedText = view.state.sliceDoc(fromB, toB);
        if (isValidUrl(insertedText) && !this.isInCodeBlock(view.state, fromB)) {
          const replacedText = tr.startState.sliceDoc(fromA, toA);
          onNextUpdate(() => {
            view.dispatch(this.createLinkTransaction(view.state, fromA, toB, insertedText, replacedText));
          });
        }
      });
    }

    /**
     * Determines if a given position is within a code block.
     * Traverses the syntax tree upwards from the position,
     * checking for CodeBlock or FencedCode nodes.
     */
    isInCodeBlock(state: EditorState, pos: number): boolean {
      const tree = syntaxTree(state);
      let node: SyntaxNode | null = tree.resolveInner(pos, -1);
      while (node) {
        if (node.name.includes('Code') || node.name.includes('FencedCode')) {
          return true;
        }
        node = node.parent;
      }
      return false;
    }

    createLinkTransaction(state: EditorState, from: number, to: number, url: string, text: string): Transaction {
      const linkText = text.trim() ? createTextLink(text, url) : createUrlLink(url);
      return state.update({
        changes: { from, to, insert: linkText },
      });
    }
  },
);
