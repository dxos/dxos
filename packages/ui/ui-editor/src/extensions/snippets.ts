//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';

const defaultItems = ['hello world!', 'this is a test.', 'this is [DXOS](https://dxos.org)'];

export type SnippetsOptions = {
  delay?: number;
  items?: string[];
};

/**
 * Configurable plugin that lets users cycle through pre-configured input snippets.
 */
// TODO(burdon): Review https://github.com/sergeche/codemirror-movie?tab=readme-ov-file
export const snippets = ({ delay = 75, items = defaultItems }: SnippetsOptions = {}): Extension => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let index = 0; // TODO(burdon): Make global.

  return [
    keymap.of([
      {
        // Reset.
        key: "alt-meta-'",
        run: () => {
          clearTimeout(timer);
          index = 0;
          return true;
        },
      },
      {
        // Next snippet.
        // TODO(burdon): Press 1-9 to select snippet?
        key: "Shift-Meta-'",
        run: (view) => {
          clearTimeout(timer);
          // TODO(burdon): Add space if needed.
          const text = items[index++];
          if (index === items?.length) {
            index = 0;
          }

          let offset = 0;
          const insert = (delayMs = 0) => {
            timer = setTimeout(() => {
              const pos = view.state.selection.main.head;
              view.dispatch({
                changes: { from: pos, insert: text[offset++] },
                selection: { anchor: pos + 1 },
              });

              if (offset < text.length) {
                insert(Math.random() * delay * (text[offset] === ' ' ? 2 : 1));
              }
            }, delayMs);
          };

          insert();
          return true;
        },
      },
    ]),
  ];
};
