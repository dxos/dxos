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
  /** The names that can be mentioned; each `@name` in the text renders as an atomic pill. */
  names: string[];
};

// TODO(burdon): Can only have a single autocompletion. Merge configuration with autocomplete.
/**
 * `@`-mentions: completes the known `names` after `@` (inserting `@name ` with a trailing space), and replaces each
 * mention with a pill widget — the same atomic-widget recipe as `hashtag`, so the cursor steps over a mention and one
 * delete removes it.
 */
export const mention = ({ debug, names }: MentionOptions): Extension => {
  const extensions: Extension[] = [
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
    }),
  ];

  const found = mentionMatcher(names);
  if (found) {
    const matcher: MatchDecorator = found;
    extensions.push(
      ViewPlugin.fromClass(
        class {
          mentions: DecorationSet;
          constructor(view: EditorView) {
            this.mentions = matcher.createDeco(view);
          }

          update(update: ViewUpdate) {
            this.mentions = matcher.updateDeco(update, this.mentions);
          }
        },
        {
          decorations: (instance) => instance.mentions,
          provide: (plugin) => EditorView.atomicRanges.of((view) => view.plugin(plugin)?.mentions ?? Decoration.none),
        },
      ),
    );
  }

  return extensions;
};

class MentionWidget extends WidgetType {
  constructor(private readonly _text: string) {
    super();
  }

  override eq(other: MentionWidget): boolean {
    return other._text === this._text;
  }

  toDOM(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = mx('dx-tag dx-tag-inline dx-tag-blue');
    span.textContent = this._text;
    return span;
  }
}

/** Matches `@name` for the known names, longest first so `@Ann Lee` is not cut short at `@Ann`. */
const mentionMatcher = (names: string[]): MatchDecorator | undefined => {
  const alternatives = [...names]
    .sort((left, right) => right.length - left.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (alternatives.length === 0) {
    return undefined;
  }

  return new MatchDecorator({
    regexp: new RegExp(`@(?:${alternatives.join('|')})(?![\\w])`, 'gi'),
    decoration: (match) => Decoration.replace({ widget: new MentionWidget(match[0]) }),
  });
};
