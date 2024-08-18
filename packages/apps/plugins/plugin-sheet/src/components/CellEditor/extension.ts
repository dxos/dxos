//
// Copyright 2023 DXOS.org
//

import {
  type CompletionContext,
  type CompletionResult,
  autocompletion,
  startCompletion,
} from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { type EditorView, keymap, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';
import { tags } from '@lezer/highlight';
import { spreadsheet } from 'codemirror-lang-spreadsheet';

/**
 * https://codemirror.net/examples/styling
 * https://lezer.codemirror.net/docs/ref/#highlight
 */
const highlightStyles = HighlightStyle.define([
  // Function.
  {
    tag: tags.name,
    class: 'text-blue-500',
  },
  // Range.
  {
    tag: tags.color,
    class: 'text-green-500',
  },
  // Values.
  {
    tag: tags.integer,
    class: 'text-green-500',
  },
  {
    tag: tags.bool,
    class: 'text-green-500',
  },
  {
    tag: tags.string,
    class: 'text-green-500',
  },
  // Error.
  {
    tag: tags.invalid,
    class: 'text-green-500',
  },
]);

export type SheetExtensionOptions = {
  functions?: string[];
};

/**
 * Spreadsheet formula extension and parser.
 * https://github.com/luizzappa/codemirror-lang-spreadsheet
 * https://github.com/luizzappa/codemirror-app-spreadsheet/blob/master/src/editor.ts
 * https://github.com/codemirror/lang-example
 * https://hyperformula.handsontable.com/guide/key-concepts.html#grammar
 */
export const sheetExtension = ({ functions }: SheetExtensionOptions): Extension => {
  // TODO(burdon): Create facet used by other plugins?
  const { extension, language } = spreadsheet({ idiom: 'en-US', decimalSeparator: '.' });

  return [
    extension,
    language.data.of({
      autocomplete: (context: CompletionContext): CompletionResult | null => {
        const match = context.matchBefore(/\w*/);
        if (!match || match.from === match.to) {
          return null;
        }

        const text = match.text.toUpperCase();
        if (!context.explicit && match.text.length < 2) {
          return null;
        }

        return {
          from: match.from,
          options: functions?.filter((name) => name.startsWith(text)).map((name) => ({ label: name })) ?? [],
        };
      },
    }),

    syntaxHighlighting(highlightStyles),
    autocompletion({
      defaultKeymap: true,
      activateOnTyping: true,
      // NOTE: Useful for debugging.
      // closeOnBlur: false,
    }),
    keymap.of([
      {
        key: 'Tab',
        run: startCompletion,
      },
    ]),
  ];
};

export type CellRangeNotifier = (range: string) => void;

type Range = { from: number; to: number };

/**
 * Tracks the currently active cell within a formula and provides a callback to modify it.
 */
export const rangeExtension = (onInit: (notifier: CellRangeNotifier) => void): Extension => {
  // TODO(burdon): Get from common facet.
  const { language } = spreadsheet({ idiom: 'en-US', decimalSeparator: '.' });

  let view: EditorView;
  let activeRange: Range | undefined;
  const provider: CellRangeNotifier = (range: string) => {
    if (activeRange) {
      view.dispatch(
        view.state.update({
          changes: { ...activeRange, insert: range.toString() },
          selection: { anchor: activeRange.from + range.length },
        }),
      );
    }

    view.focus();
  };

  return ViewPlugin.fromClass(
    class {
      constructor(v: EditorView) {
        view = v;
        onInit(provider);
      }

      update(view: ViewUpdate) {
        const { anchor } = view.state.selection.ranges[0];

        // Find first Range or cell at cursor.
        activeRange = undefined;
        const { topNode } = language.parser.parse(view.state.doc.toString());
        visitTree(topNode, ({ type, from, to }) => {
          if (from <= anchor && to >= anchor) {
            switch (type.name) {
              case 'Function': {
                // Mark but keep looking.
                activeRange = { from: to, to };
                break;
              }

              case 'RangeToken':
              case 'CellToken':
                activeRange = { from, to };
                return true;
            }
          }

          return false;
        });
      }
    },
  );
};

const visitTree = (node: SyntaxNode, callback: (node: SyntaxNode) => boolean): boolean => {
  if (callback(node)) {
    return true;
  }

  for (let child = node.firstChild; child !== null; child = child.nextSibling) {
    if (visitTree(child, callback)) {
      return true;
    }
  }

  return false;
};
