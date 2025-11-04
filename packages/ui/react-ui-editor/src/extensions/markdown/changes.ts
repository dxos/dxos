//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type ChangeSpec, Transaction } from '@codemirror/state';
import { type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';

/**
 * Monitors and augments changes.
 */
// TODO(burdon): Tests.
export const adjustChanges = () =>
  ViewPlugin.fromClass(
    class implements PluginValue {
      update(update: ViewUpdate) {
        const tree = syntaxTree(update.state);
        const adjustments: ChangeSpec[] = [];

        for (const tr of update.transactions) {
          const event = tr.annotation(Transaction.userEvent);
          switch (event) {
            //
            // Enter
            //
            case 'input': {
              const changes = tr.changes;
              if (changes.empty) {
                break;
              }

              changes.iterChanges((fromA) => {
                const node = tree.resolveInner(fromA, 1);
                if (node?.name === 'BulletList') {
                  // Add space to previous line if an empty list item (otherwise it is not interpreted as a Task).
                  const { text } = update.state.doc.lineAt(fromA);
                  if (text.endsWith(']')) {
                    adjustments.push({ from: fromA, to: fromA, insert: ' ' });
                  }
                }
              });

              break;
            }

            //
            // Paste
            //
            case 'input.paste': {
              const changes = tr.changes;
              if (changes.empty) {
                break;
              }

              changes.iterChanges((fromA, toA, fromB, toB, text) => {
                // Check for URL.
                const url = getValidUrl(update.view.state.sliceDoc(fromB, toB));
                if (url) {
                  // Check if pasting inside existing link.
                  const node = tree.resolveInner(fromA, -1);
                  const invalidPositions = new Set(['Code', 'CodeText', 'FencedCode', 'Link', 'LinkMark', 'URL']);
                  if (!invalidPositions.has(node?.name)) {
                    const replacedText = tr.startState.sliceDoc(fromA, toA);
                    adjustments.push({ from: fromA, to: toB, insert: createLink(url, replacedText) });
                  }
                } else {
                  const node = tree.resolveInner(fromA, 1);
                  switch (node?.name) {
                    case 'Task': {
                      // Remove task marker if pasting into task list.
                      const str = text.toString();
                      const match = str.match(/\s*- \[[ xX]\]\s*(.+)/);
                      if (match) {
                        const [, replacement] = match;
                        adjustments.push({ from: fromA, to: toB, insert: replacement });
                      }
                      break;
                    }
                  }
                }
              });

              break;
            }
          }
        }

        // TODO(burdon): Is this the right way to augment changes? Alt: EditorState.transactionFilter
        if (adjustments.length) {
          setTimeout(() => {
            update.view.dispatch(
              update.view.state.update({
                changes: adjustments,
              }),
            );
          });
        }
      }
    },
  );

//
// Links
//

export const createLink = (url: URL, label: string): string => {
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

  return [protocol, host].filter(Boolean).join('//') + (pathname !== '/' ? pathname : '');
};

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
