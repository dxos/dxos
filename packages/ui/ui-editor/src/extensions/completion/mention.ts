//
// Copyright 2023 DXOS.org
//

import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  autocompletion,
  pickedCompletion,
} from '@codemirror/autocomplete';
import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';

export type MentionOptions = {
  debug?: boolean;
  onSearch: (text: string) => string[];
};

const addMention = StateEffect.define<{ from: number; to: number }>({
  map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) }),
});

const mentionMark = Decoration.mark({ class: 'cm-mention' });

/** The mentions a completion inserted, kept in step with later edits so each stays one atomic unit. */
const mentions = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (value, tr) => {
    let next = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(addMention)) {
        next = next.update({ add: [mentionMark.range(effect.value.from, effect.value.to)] });
      }
    }
    // An edit that cut into a mention leaves a fragment, which is plain text rather than a mention.
    return next.update({
      filter: (from, to) => to > from && tr.state.doc.sliceString(from, from + 1) === '@',
    });
  },
  provide: (field) => [
    EditorView.decorations.from(field),
    EditorView.atomicRanges.of((view) => view.state.field(field)),
  ],
});

/** Inserts the mention plus a trailing space, and records the mention as atomic. */
const applyMention = (view: EditorView, completion: Completion, from: number, to: number) => {
  const end = from + completion.label.length;
  view.dispatch({
    changes: { from, to, insert: `${completion.label} ` },
    selection: { anchor: end + 1 },
    effects: addMention.of({ from, to: end }),
    annotations: pickedCompletion.of(completion),
  });
};

// TODO(burdon): Can only have a single autocompletion. Merge configuration with autocomplete.
/**
 * `@`-mention autocomplete completion source. An accepted mention is followed by a space and behaves as one unit: the
 * cursor steps over it and a single delete removes it.
 */
export const mention = ({ debug, onSearch }: MentionOptions): Extension => [
  mentions,
  autocompletion({
    activateOnTyping: true,
    closeOnBlur: !debug,
    icons: false,
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const match = context.matchBefore(/@(\w+)?/);
        if (!match || (match.from === match.to && !context.explicit)) {
          return null;
        }

        return {
          from: match.from,
          options: onSearch(match.text.slice(1).toLowerCase()).map((value) => ({
            label: `@${value}`,
            apply: applyMention,
          })),
        };
      },
    ],
  }),
];
