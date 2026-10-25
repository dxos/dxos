//
// Copyright 2023 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

import { mx } from '@dxos/ui-theme';

export type MentionOptions = {
  debug?: boolean;
  /** The names offered after `@`. */
  names: string[];
};

// TODO(burdon): Can only have a single autocompletion. Merge configuration with autocomplete.
/**
 * `@`-mention completion: offers the known `names` after `@` and inserts `@name ` with a trailing space. Pair with
 * {@link mentionPills} to render mentions as atomic pills.
 */
export const mention = ({ debug, names }: MentionOptions): Extension =>
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

        const text = match.text.slice(1).toLowerCase();
        return {
          from: match.from,
          options: names
            .filter((name) => name.toLowerCase().startsWith(text))
            .map((name) => ({ label: `@${name}`, apply: `@${name} ` })),
        };
      },
    ],
  });

/**
 * Replaces each `@mention` with a pill widget — the same atomic-widget recipe as `hashtag`, so the cursor steps over a
 * mention and one delete removes it.
 */
export const mentionPills = (): Extension =>
  ViewPlugin.fromClass(
    class {
      mentions: DecorationSet;
      constructor(view: EditorView) {
        this.mentions = mentionMatcher.createDeco(view);
      }

      update(update: ViewUpdate) {
        this.mentions = mentionMatcher.updateDeco(update, this.mentions);
      }
    },
    {
      decorations: (instance) => instance.mentions,
      provide: (plugin) => EditorView.atomicRanges.of((view) => view.plugin(plugin)?.mentions ?? Decoration.none),
    },
  );

class MentionWidget extends WidgetType {
  constructor(private readonly _text: string) {
    super();
  }

  override eq(other: MentionWidget): boolean {
    return other._text === this._text;
  }

  toDOM(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = mx('dx-tag dx-tag-inline dx-tag-blue mx-0.5');
    span.textContent = this._text;
    return span;
  }
}

const mentionMatcher = new MatchDecorator({
  regexp: /@\w+/g,
  decoration: (match) => Decoration.replace({ widget: new MentionWidget(match[0]) }),
});
