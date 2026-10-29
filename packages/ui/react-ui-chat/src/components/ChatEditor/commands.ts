//
// Copyright 2026 DXOS.org
//

import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  acceptCompletion,
  autocompletion,
  closeCompletion,
  completionStatus,
  currentCompletions,
  pickedCompletion,
  selectedCompletionIndex,
  setSelectedCompletion,
  startCompletion,
} from '@codemirror/autocomplete';
import { type EditorState, type Extension, Facet, Prec } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, keymap } from '@codemirror/view';

export type CommandData = { sentinel: string; description?: string };

/** Pure prefix matcher, exported for tests. */
export const matchCommands = (all: CommandData[], token: string): CommandData[] =>
  token.startsWith('$') || token.startsWith('/') ? all.filter(({ sentinel }) => sentinel.startsWith(token)) : [];

const leadingCommand = (text: string, all: CommandData[]): string | undefined => {
  const token = /^[$/][\w:-]+(?=\s|$)/.exec(text)?.[0];
  return all.some(({ sentinel }) => sentinel === token) ? token : undefined;
};

export type CommandsOptions = { getCommands: () => CommandData[] };

const applyAtStart =
  (all: CommandData[], sentinel: string) =>
  (view: EditorView, completion: Completion, from: number, to: number): void => {
    const rest = view.state.sliceDoc(to);
    const word = /^[$/][\w:-]*(?=\s|$)/.exec(rest)?.[0];
    const replaces =
      word !== undefined &&
      (all.some((command) => command.sentinel === word) ||
        (rest.trim() === word && matchCommands(all, word).length > 0));
    const end = replaces ? to + word.length : to;
    const next = view.state.sliceDoc(end, end + 1);
    const separated = /^\s/.test(next);
    // Past the space before the arguments; at a line break, the end of the command.
    const argumentsAt = from + sentinel.length + (separated && next !== ' ' ? 0 : 1);
    view.dispatch({
      changes: { from, to: end, insert: separated ? sentinel : `${sentinel} ` },
      selection: { anchor: argumentsAt },
      annotations: pickedCompletion.of(completion),
      userEvent: 'input.complete',
    });
  };

const narrowCommands = (all: CommandData[], typed: string): CommandData[] =>
  all.filter(({ sentinel }) => sentinel.startsWith(typed) || sentinel.slice(1).startsWith(typed));

/**
 * Command completion: typing `$` offers the bound context's instruction sentinels anywhere;
 * typing `/` at the start of the prompt offers registered slash commands.
 */
const commandMark = Decoration.mark({
  // Inline in text, so the pill keeps its own inset from the words either side.
  class: 'dx-tag dx-tag-inline mx-0.5',
  // Baseline alignment puts the pill's text on the line's baseline; the negative block margin
  // cancels the padded pill's line-box growth (same recipe as `.dx-tag-anchor` in CodeMirror).
  attributes: {
    'data-hue': 'blue',
    'style': 'margin-block: -5px;',
    'font-family': 'var(--dx-font-mono, monospace)',
  },
});

/** Decorates a prompt-leading registered command token as a tag. */
const commandDecorations = (getCommands: () => CommandData[]) => {
  const build = (view: EditorView): DecorationSet => {
    const command = leadingCommand(view.state.doc.line(1).text, getCommands());
    return command ? Decoration.set([commandMark.range(0, command.length)]) : Decoration.none;
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

/** Present when `commands()` is installed, so the host (`ChatEditor`) renders the completion list itself. */
export const commandCompletionHost = Facet.define<boolean, boolean>({ combine: (values) => values.some(Boolean) });

// The host draws the list in a portalled popover, which the prompt's container cannot clip; CodeMirror's own list stays
// in the accessibility tree (visually hidden) because the editor's `aria-activedescendant` points into it.
const hiddenTooltipTheme = EditorView.theme({
  '.cm-tooltip.cm-tooltip-autocomplete': {
    position: 'fixed',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
});

export type CommandCompletionOption = { label: string; detail?: string };

export type CommandCompletionState = {
  open: boolean;
  options: readonly CommandCompletionOption[];
  selected: number | null;
};

export const closedCommandCompletion: CommandCompletionState = { open: false, options: [], selected: null };

/** The open completion list, read through this module's `@codemirror/autocomplete` (see the Enter binding below). */
export const getCommandCompletion = (state: EditorState): CommandCompletionState => {
  if (!state.facet(commandCompletionHost) || completionStatus(state) !== 'active') {
    return closedCommandCompletion;
  }
  const options = currentCompletions(state);
  return { open: options.length > 0, options, selected: selectedCompletionIndex(state) };
};

/** Moves the completion selection (e.g., on pointer hover). */
export const selectCommandCompletion = (view: EditorView, index: number): void => {
  if (selectedCompletionIndex(view.state) !== index) {
    view.dispatch({ effects: setSelectedCompletion(index) });
  }
};

/** CodeMirror's default `interactionDelay`, during which `acceptCompletion` refuses so a fast Enter cannot pick. */
const INTERACTION_DELAY = 75;

/** Accepts the completion at `index` (e.g., on click). */
export const acceptCommandCompletion = (view: EditorView, index: number): void => {
  selectCommandCompletion(view, index);
  const clicked = currentCompletions(view.state)[index];
  if (!acceptCompletion(view)) {
    // A click is deliberate, so one inside the delay is accepted once it ends rather than dropped - but only the
    // option clicked: a list reopened meanwhile builds new options, which may sit at the same index.
    setTimeout(() => {
      if (
        completionStatus(view.state) === 'active' &&
        selectedCompletionIndex(view.state) === index &&
        currentCompletions(view.state)[index] === clicked
      ) {
        acceptCompletion(view);
      }
    }, INTERACTION_DELAY);
  }
};

export const closeCommandCompletion = (view: EditorView): void => {
  closeCompletion(view);
};

export const commands = ({ getCommands }: CommandsOptions): Extension => [
  commandCompletionHost.of(true),
  hiddenTooltipTheme,
  commandDecorations(getCommands),
  // Arrow navigation stops at the ends of the list rather than cycling; it precedes `autocompletion()`, whose own
  // `Prec.highest` keymap cycles and would otherwise win the precedence tie by extension order.
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
  autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const toOption = ({ sentinel, description }: CommandData) => ({
          label: sentinel,
          detail: description,
          apply: /^\s/.test(context.state.sliceDoc(context.pos, context.pos + 1)) ? sentinel : `${sentinel} `,
        });

        if (context.explicit && context.pos === 0) {
          const all = getCommands();
          const narrowed = (typed: string): CompletionResult | null =>
            /^[$/]?[\w:-]*$/.test(typed)
              ? {
                  from: 0,
                  filter: false,
                  options: narrowCommands(all, typed).map(({ sentinel, description }) => ({
                    label: sentinel,
                    detail: description,
                    apply: applyAtStart(all, sentinel),
                  })),
                  update: (_current, from, to, { state }) => narrowed(state.sliceDoc(from, to)),
                }
              : null;
          return narrowed('');
        }

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
        return { from: word.from, options: options.map(toOption) };
      },
    ],
  }),
  // The host editor's `submit()` extension also binds Enter at `Prec.highest`; ties between equal
  // precedences break by extension order, so the caller must place this extension ahead of `submit()`.
  // `completionStatus`/`acceptCompletion` are imported from the same module as `autocompletion()` above
  // (not re-derived in a different package) so this always reads the completion state `autocompletion()`
  // actually wrote - a cross-package import of the same-named API can resolve to a distinct bundled
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

/**
 * Opens the completion list on every command at the start of the prompt without editing it; typing narrows the list,
 * and dismissing it leaves the prompt as it was.
 */
export const openCommandCompletion = (view: EditorView): void => {
  view.dispatch({ selection: { anchor: 0 } });
  view.focus();
  startCompletion(view);
};
