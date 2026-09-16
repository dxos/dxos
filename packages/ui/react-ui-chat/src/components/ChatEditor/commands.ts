//
// Copyright 2026 DXOS.org
//

import {
  type CompletionContext,
  type CompletionResult,
  acceptCompletion,
  autocompletion,
  completionStatus,
  currentCompletions,
  selectedCompletionIndex,
  setSelectedCompletion,
} from '@codemirror/autocomplete';
import { type Extension, Prec } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, keymap } from '@codemirror/view';

export type CommandData = { sentinel: string; description?: string };

/** Pure prefix matcher, exported for tests. */
export const matchCommands = (all: CommandData[], token: string): CommandData[] =>
  token.startsWith('$') || token.startsWith('/') ? all.filter(({ sentinel }) => sentinel.startsWith(token)) : [];

export type CommandsOptions = { getCommands: () => CommandData[] };

/**
 * Command completion: typing `$` offers the bound context's instruction sentinels anywhere;
 * typing `/` at the start of the prompt offers registered slash commands.
 */
const commandMark = Decoration.mark({
  class: 'dx-tag',
  // Baseline alignment puts the pill's text on the line's baseline; the negative block margin
  // cancels the padded pill's line-box growth (same recipe as `.dx-tag--anchor` in CodeMirror).
  attributes: {
    'data-hue': 'blue',
    'style': 'margin-block: -5px;',
    'font-family': 'var(--dx-font-mono, monospace)',
  },
});

/** Decorates a prompt-leading registered command token as a tag. */
const commandDecorations = (getCommands: () => CommandData[]) => {
  const build = (view: EditorView): DecorationSet => {
    const match = /^[$/][\w:-]+/.exec(view.state.doc.line(1).text);
    return match && getCommands().some(({ sentinel }) => sentinel === match[0])
      ? Decoration.set([commandMark.range(0, match[0].length)])
      : Decoration.none;
  };
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = build(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = build(update.view);
        }
      }
    },
    {
      decorations: (instance) => instance.decorations,
      // Atomic: the cursor steps over the tag as one unit and backspace removes it whole.
      provide: (plugin) => EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  );
};

/** Two-column command/description layout; shared column widths via subgrid. */
const commandTooltipTheme = EditorView.theme({
  '.cm-tooltip-autocomplete > ul': {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: '0.75rem',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    display: 'grid',
    gridTemplateColumns: 'subgrid',
    gridColumn: 'span 2',
    alignItems: 'center',
  },
  '.cm-tooltip-autocomplete .cm-completionLabel': {
    fontFamily: 'var(--dx-font-mono, monospace)',
  },
  '.cm-tooltip-autocomplete .cm-completionDetail': {
    fontStyle: 'normal',
    fontSize: '0.875rem',
    marginInlineStart: '0',
  },
});

export const commands = ({ getCommands }: CommandsOptions): Extension => [
  commandTooltipTheme,
  commandDecorations(getCommands),
  autocompletion({
    // The prompt sits at the bottom of its panel, so the list opens upward.
    aboveCursor: true,
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/[$/][\w:-]*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }
        // Slash commands are prompt-leading only, so a mid-sentence path fragment never completes.
        if (context.state.sliceDoc(word.from, word.from + 1) === '/' && word.from !== 0) {
          return null;
        }
        const options = matchCommands(getCommands(), context.state.sliceDoc(word.from, word.to));
        if (options.length === 0) {
          return null;
        }
        return {
          from: word.from,
          // Accepting appends the separator space, so the arguments can be typed immediately.
          options: options.map(({ sentinel, description }) => ({
            label: sentinel,
            detail: description,
            apply: `${sentinel} `,
          })),
        };
      },
    ],
  }),
  // Arrow navigation stops at the ends of the list rather than cycling.
  Prec.highest(
    keymap.of([
      {
        key: 'ArrowDown',
        run: (view) => {
          if (completionStatus(view.state) !== 'active') {
            return false;
          }
          const index = selectedCompletionIndex(view.state);
          if (index === null) {
            return false;
          }
          if (index < currentCompletions(view.state).length - 1) {
            view.dispatch({ effects: setSelectedCompletion(index + 1) });
          }
          return true;
        },
      },
      {
        key: 'ArrowUp',
        run: (view) => {
          if (completionStatus(view.state) !== 'active') {
            return false;
          }
          const index = selectedCompletionIndex(view.state);
          if (index === null) {
            return false;
          }
          if (index > 0) {
            view.dispatch({ effects: setSelectedCompletion(index - 1) });
          }
          return true;
        },
      },
    ]),
  ),
  // The host editor's `submit()` extension also binds Enter at `Prec.highest`; ties between equal
  // precedences break by extension order, so the caller must place this extension ahead of `submit()`.
  // `completionStatus`/`acceptCompletion` are imported from the same module as `autocompletion()` above
  // (not re-derived in a different package) so this always reads the completion state `autocompletion()`
  // actually wrote — a cross-package import of the same-named API can resolve to a distinct bundled
  // copy of `@codemirror/autocomplete` under some bundler configurations, silently reading `null`.
  Prec.highest(
    keymap.of([
      {
        key: 'Enter',
        run: (view) => (completionStatus(view.state) === 'active' ? acceptCompletion(view) : false),
      },
    ]),
  ),
];
