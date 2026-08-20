//
// Copyright 2026 DXOS.org
//

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  hoverTooltip,
} from '@codemirror/view';

import { type RenderCallback } from '@dxos/ui-editor/types';

/** What the reader knows about one token; `wordId` is set only for terms held in a deck. */
export type VocabularyEntry = {
  term: string;
  translation: string;
  reading?: string;
  partOfSpeech?: string;
  wordId?: string;
};

/** Resolves a token (already normalized with {@link normalizeToken}) to a known entry. */
export type VocabularyLookup = (token: string) => VocabularyEntry | undefined;

export type VocabularyTooltipProps = {
  /** The token as it appears in the document. */
  token: string;
  /** The sentence the token appeared in, for context-sensitive translation. */
  context: string;
  entry?: VocabularyEntry;
};

export type VocabularyOptions = {
  lookup: VocabularyLookup;
  /**
   * Render known terms as their translation instead of underlining the original. The split view
   * mounts two editors over the same text, one with this set and one without.
   */
  translate?: boolean;
  /** Underline terms the lookup resolves. */
  highlight?: boolean;
  /** Renders the hover card; omitted, no tooltip is shown. */
  render?: RenderCallback<VocabularyTooltipProps>;
};

/**
 * Matches a word token. Trailing marks, hyphens and apostrophes stay inside the token so that
 * "l'école" and "well-being" resolve as single terms rather than three.
 */
const TOKEN_RE = /\p{L}[\p{L}\p{M}’'-]*/gu;

/** Lookup key for a token: case- and accent-fold so "Buch" and "buch" hit the same entry. */
export const normalizeToken = (token: string): string => token.toLocaleLowerCase().normalize('NFC').replace(/’/g, "'");

/** The token spanning `pos`, or undefined when the position is not inside a word. */
export const tokenAt = (view: EditorView, pos: number): { from: number; to: number; text: string } | undefined => {
  const line = view.state.doc.lineAt(pos);
  for (const match of line.text.matchAll(TOKEN_RE)) {
    const from = line.from + match.index;
    const to = from + match[0].length;
    if (pos >= from && pos <= to) {
      return { from, to, text: match[0] };
    }
  }
  return undefined;
};

/** The line around `pos`, used as translation context for the hover card. */
const contextAt = (view: EditorView, pos: number): string => view.state.doc.lineAt(pos).text;

const knownMark = Decoration.mark({
  class: 'underline decoration-dotted decoration-1 underline-offset-4 cursor-help',
});

class TranslationWidget extends WidgetType {
  constructor(private readonly _entry: VocabularyEntry) {
    super();
  }

  override eq(other: TranslationWidget): boolean {
    return other._entry.translation === this._entry.translation;
  }

  override toDOM(): HTMLElement {
    const el = document.createElement('span');
    el.className = 'italic text-accent cursor-help';
    el.textContent = this._entry.translation;
    el.title = this._entry.term;
    return el;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Builds decorations for the visible ranges only: a long document holds tens of thousands of
 * tokens and the lookup runs per token, so scanning the whole doc would stall the first paint.
 */
const buildDecorations = (view: EditorView, { lookup, translate, highlight }: VocabularyOptions): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  if (!translate && !highlight) {
    return builder.finish();
  }

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      for (const match of line.text.matchAll(TOKEN_RE)) {
        const entry = lookup(normalizeToken(match[0]));
        if (!entry) {
          continue;
        }
        const start = line.from + match.index;
        const end = start + match[0].length;
        builder.add(start, end, translate ? Decoration.replace({ widget: new TranslationWidget(entry) }) : knownMark);
      }
      pos = line.to + 1;
    }
  }

  return builder.finish();
};

/**
 * Reveals vocabulary inline: underlines terms held in the reader's decks (or swaps them for their
 * translation) and shows a hover card with the translation, reading and part of speech.
 *
 * The lookup is supplied by the container so the extension stays free of ECHO and React; the
 * container rebuilds it from its word query and reconfigures the editor when it changes.
 */
export const vocabulary = (options: VocabularyOptions): Extension => {
  const { render } = options;

  const decorations = ViewPlugin.fromClass(
    class implements PluginValue {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, options);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view, options);
        }
      }
    },
    { decorations: (value) => value.decorations },
  );

  if (!render) {
    return [decorations];
  }

  return [
    decorations,
    hoverTooltip((view, pos) => {
      const token = tokenAt(view, pos);
      if (!token) {
        return null;
      }

      const entry = options.lookup(normalizeToken(token.text));
      return {
        pos: token.from,
        end: token.to,
        above: true,
        create: () => {
          const el = document.createElement('div');
          render(el, { token: token.text, context: contextAt(view, pos), entry }, view);
          return { dom: el, offset: { x: 0, y: 4 } };
        },
      };
    }),
  ];
};
