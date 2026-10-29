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
        const match = context.matchBefore(MENTION_START);
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

export type MentionPillsOptions = {
  /** Names a mention may span, so a completed `@Jane Doe` is one pill; any other `@word` is matched up to the word. */
  names?: readonly string[];
  /** The palette hue of the actor a name refers to, so a pill matches their avatar; blue when unknown. */
  hue?: (name: string) => string | undefined;
};

/**
 * An `@` that starts a mention, with the name typed so far: not inside a word (so an email address is left alone), and
 * the name may hold spaces and any letters, so `@Jane D` or `@José` keeps narrowing the list.
 */
const MENTION_START = /(?<![\p{L}\p{N}_.@])@([\p{L}\p{N}_][\p{L}\p{N}_ ]*)?/u;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Listed names first, longest first, so `@Jane Doe` wins over `@Jane`; case-insensitive, as completion is. */
const mentionPattern = (names: readonly string[] = []): RegExp => {
  const listed = [...names]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|');
  return new RegExp(
    `(?<![\\p{L}\\p{N}_.@])@(${listed ? `(?:${listed})(?![\\p{L}\\p{N}_])|` : ''}[\\p{L}\\p{N}_]+)`,
    'giu',
  );
};

/**
 * Replaces each `@mention` with a pill widget - the same atomic-widget recipe as `hashtag`, so the cursor steps over a
 * mention and one delete removes it.
 */
export const mentionPills = ({ names, hue }: MentionPillsOptions = {}): Extension => {
  const matcher = new MatchDecorator({
    regexp: mentionPattern(names),
    decoration: (match) => Decoration.replace({ widget: new MentionWidget(match[0], hue?.(match[1]) ?? 'blue') }),
  });

  return ViewPlugin.fromClass(
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
  );
};

class MentionWidget extends WidgetType {
  constructor(
    private readonly _text: string,
    private readonly _hue: string,
  ) {
    super();
  }

  override eq(other: MentionWidget): boolean {
    return other._text === this._text && other._hue === this._hue;
  }

  toDOM(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = mx('dx-tag dx-tag-inline mx-0.5', `dx-tag-${this._hue}`);
    span.textContent = this._text;
    return span;
  }
}
