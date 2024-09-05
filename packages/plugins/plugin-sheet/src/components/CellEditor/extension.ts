//
// Copyright 2023 DXOS.org
//

import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  acceptCompletion,
  autocompletion,
  completionStatus,
  startCompletion,
} from '@codemirror/autocomplete';
import { HighlightStyle, type Language, syntaxHighlighting } from '@codemirror/language';
import { type Extension, Facet } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate, keymap } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';
import { tags } from '@lezer/highlight';
import { spreadsheet } from 'codemirror-lang-spreadsheet';

import { mx } from '@dxos/react-ui-theme';

import { type FunctionDefinition } from '../../model';

/**
 * https://codemirror.net/examples/styling
 * https://lezer.codemirror.net/docs/ref/#highlight
 * https://github.com/luizzappa/codemirror-lang-spreadsheet/blob/main/src/index.ts#L28 (mapping)
 */
// TODO(burdon): Define light/dark.
const highlightStyles = HighlightStyle.define([
  // Function.
  {
    tag: tags.name,
    class: 'text-primary-500',
  },
  // Range.
  {
    tag: tags.tagName,
    class: 'text-pink-500',
  },
  // Values.
  {
    tag: tags.number,
    class: 'text-teal-500',
  },
  {
    tag: tags.bool,
    class: 'text-teal-500',
  },
  {
    tag: tags.string,
    class: 'text-teal-500',
  },
  // Error.
  {
    tag: tags.invalid,
    class: 'text-neutral-500',
  },
]);

const languageFacet = Facet.define<Language>();

export type SheetExtensionOptions = {
  functions?: FunctionDefinition[];
};

/**
 * Spreadsheet formula extension and parser.
 * https://github.com/luizzappa/codemirror-lang-spreadsheet
 * https://github.com/luizzappa/codemirror-app-spreadsheet/blob/master/src/editor.ts
 * https://github.com/codemirror/lang-example
 * https://hyperformula.handsontable.com/guide/key-concepts.html#grammar
 */
export const sheetExtension = ({ functions = [] }: SheetExtensionOptions): Extension => {
  const { extension, language } = spreadsheet({ idiom: 'en-US', decimalSeparator: '.' });

  const createCompletion = (name: string) => {
    const { section = 'Custom', description, syntax } = functions.find((value) => value.name === name) ?? {};

    return {
      section,
      label: name,
      info: () => {
        if (!description && !syntax) {
          return null;
        }

        // TODO(burdon): Standardize color styles.
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-2 text-sm';

        const title = document.createElement('h2');
        title.innerText = name;
        title.className = 'text-lg font-mono text-primary-500';
        root.appendChild(title);

        if (description) {
          const info = document.createElement('p');
          info.innerText = description;
          info.className = 'fg-subdued';
          root.appendChild(info);
        }

        if (syntax) {
          const detail = document.createElement('pre');
          detail.innerText = syntax;
          detail.className = 'whitespace-pre-wrap text-green-500';
          root.appendChild(detail);
        }

        return root;
      },
      apply: (view, completion, from, to) => {
        const insertParens = to === view.state.doc.toString().length;
        view.dispatch(
          view.state.update({
            changes: {
              from,
              to,
              insert: completion.label + (insertParens ? '()' : ''),
            },
            selection: {
              anchor: from + completion.label.length + 1,
            },
          }),
        );
      },
    } satisfies Completion;
  };

  return [
    extension,
    languageFacet.of(language),
    language.data.of({
      autocomplete: (context: CompletionContext): CompletionResult | null => {
        if (context.state.doc.toString()[0] !== '=') {
          return null;
        }
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
          options:
            functions?.filter(({ name }) => name.startsWith(text)).map(({ name }) => createCompletion(name)) ?? [],
        };
      },
    }),

    syntaxHighlighting(highlightStyles),
    autocompletion({
      aboveCursor: false,
      defaultKeymap: true,
      activateOnTyping: true,
      // NOTE: Useful for debugging.
      closeOnBlur: false,
      icons: false,
      tooltipClass: () =>
        mx(
          // TODO(burdon): Factor out fragments.
          // TODO(burdon): Size to make width same as column.
          '!-left-[1px] !top-[33px] !-m-0 border !border-t-0 [&>ul]:!min-w-[198px]',
          '[&>ul>li[aria-selected]]:!bg-primary-700',
          'border-neutral-200 dark:border-neutral-700',
        ),
    }),
    keymap.of([
      {
        key: 'Tab',
        run: (view) => {
          return completionStatus(view.state) === 'active' ? acceptCompletion(view) : startCompletion(view);
        },
      },
    ]),

    // Parsing.
    // StateField.define({
    //   create: (state) => {},
    //   update: (value, tr) => {
    //     log.info('update');
    //     syntaxTree(tr.state).iterate({
    //       enter: ({ type, from, to }) => {
    //         log.info('node', { type: type.name, from, to });
    //       },
    //     });
    //   },
    // }),
  ];
};

export type CellRangeNotifier = (range: string) => void;

type Range = { from: number; to: number };

/**
 * Tracks the currently active cell within a formula and provides a callback to modify it.
 */
export const rangeExtension = (onInit: (notifier: CellRangeNotifier) => void): Extension => {
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
      constructor(_view: EditorView) {
        view = _view;
        onInit(provider);
      }

      update(view: ViewUpdate) {
        const { anchor } = view.state.selection.ranges[0];

        // Find first Range or cell at cursor.
        activeRange = undefined;
        const [language] = view.state.facet(languageFacet);
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

        // Allow start of formula.
        if (!activeRange && view.state.doc.toString()[0] === '=') {
          activeRange = { from: 1, to: view.state.doc.toString().length };
        }
      }
    },
  );
};

/**
 * Lezer parse result visitor.
 */
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
