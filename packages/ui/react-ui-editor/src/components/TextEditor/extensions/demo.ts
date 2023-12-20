//
// Copyright 2023 DXOS.org
//

import { keymap } from '@codemirror/view';

export type DemoOptions = {
  delay?: number;
  items?: string[];
};

const defaultItems = ['hello world!', 'this is a test.', 'this is [DXOS](https://dxos.org)'];

/**
 * Demo script.
 * Configurable plugin that let's user cycle through pre-configured input script.
 */
export const demo = ({ delay = 75, items = defaultItems }: DemoOptions = {}) => {
  let t: any;
  let idx = 0;

  return [
    keymap.of([
      {
        // Reset.
        key: "alt-meta-'",
        run: (view) => {
          clearTimeout(t);
          idx = 0;
          return true;
        },
      },
      {
        // Next prompt.
        // TODO(burdon): Press 1-9 to select prompt?
        key: "shift-meta-'",
        run: (view) => {
          clearTimeout(t);
          // TODO(burdon): Add space if needed.
          const text = items[idx++];
          if (idx === items?.length) {
            idx = 0;
          }

          let i = 0;
          const insert = (d = 0) => {
            t = setTimeout(() => {
              const pos = view.state.selection.main.head;
              view.dispatch({
                changes: { from: pos, insert: text[i++] },
                selection: { anchor: pos + 1 },
              });

              if (i < text.length) {
                insert(Math.random() * delay * (text[i] === ' ' ? 2 : 1));
              }
            }, d);
          };

          insert();
          return true;
        },
      },
    ]),
  ];
};
