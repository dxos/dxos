//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, Transaction } from '@codemirror/state';
import { ViewPlugin, type ViewUpdate, type PluginValue } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

export const linkPastePlugin = ViewPlugin.fromClass(
  class implements PluginValue {
    update(update: ViewUpdate) {
      for (const tr of update.transactions) {
        const event = tr.annotation(Transaction.userEvent);
        if (event === 'input.paste') {
          const changes = tr.changes;
          if (changes.empty) {
            return;
          }

          changes.iterChangedRanges((fromA, toA, fromB, toB) => {
            const insertedUrl = getValidUrl(update.view.state.sliceDoc(fromB, toB));
            if (insertedUrl && isValidPosition(update.view.state, fromB)) {
              // We might be pasting over an existing text.
              const replacedText = tr.startState.sliceDoc(fromA, toA);
              setTimeout(() => {
                update.view.dispatch(
                  update.view.state.update({
                    changes: { from: fromA, to: toB, insert: createLink(insertedUrl, replacedText) },
                  }),
                );
              });
            }
          });
        }
      }
    }
  },
);

const createLink = (url: URL, label: string): string => {
  // Check if image.
  // Example: https://dxos.network/dxos-logotype-blue.png
  const { host, pathname } = url;
  const [, extension] = pathname.split('.');
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
  if (imageExtensions.includes(extension)) {
    return `![${label || host}](${url})`;
  }

  if (!label) {
    label = createLinkLabel(url);
  }

  return `[${label}](${url})`;
};

export const createLinkLabel = (url: URL): string => {
  let { protocol, host, pathname } = url;
  if (protocol === 'http:' || protocol === 'https:') {
    protocol = '';
  }

  // NOTE(Zan): Consult: https://github.com/dxos/dxos/issues/7331 before changing this.
  // Remove 'www.' if at the beginning of the URL
  host = host.replace(/^www\./, '');

  return [protocol, host].filter(Boolean).join('//') + pathname;
};

/**
 * Returns a valid URL if appropriate for a link.
 */
const getValidUrl = (str: string): URL | undefined => {
  const validProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  try {
    const url = new URL(str);
    if (!validProtocols.includes(url.protocol)) {
      return undefined;
    }

    return url;
  } catch (_err) {
    return undefined;
  }
};

/**
 * Traverses the syntax tree upwards from the position.
 */
const isValidPosition = (state: EditorState, pos: number): boolean => {
  const invalidPositions = new Set(['Link', 'LinkMark', 'Code', 'FencedCode']);
  const tree = syntaxTree(state);
  let node: SyntaxNode | null = tree.resolveInner(pos, -1);
  while (node) {
    if (invalidPositions.has(node.name)) {
      return false;
    }

    node = node.parent;
  }

  return true;
};
