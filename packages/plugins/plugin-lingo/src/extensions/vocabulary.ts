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
  /** BCP-47 tag of the text being read; steers word segmentation. */
  locale?: string;
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
 * How many adjacent segments a term may span. ICU splits compounds ("パン屋" → "パン" + "屋"), so a
 * deck term is matched by joining neighbours; the cap bounds the per-token lookup count.
 */
const MAX_SEGMENT_SPAN = 4;

export type Token = { from: number; to: number; text: string };

const segmenters = new Map<string, Intl.Segmenter>();

/**
 * Word segmentation via `Intl.Segmenter` rather than a `\p{L}+` regex: Japanese, Chinese and Thai
 * write without delimiters, so a regex returns the whole sentence as one token and nothing matches.
 */
const getSegmenter = (locale?: string): Intl.Segmenter => {
  const key = locale ?? '';
  let segmenter = segmenters.get(key);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    segmenters.set(key, segmenter);
  }
  return segmenter;
};

/** Word-like segments of `text`, with `offset` added so positions are document-absolute. */
const segment = (text: string, offset: number, locale?: string): Token[] =>
  Array.from(getSegmenter(locale).segment(text))
    .filter(({ isWordLike }) => isWordLike)
    .map(({ index, segment }) => ({ from: offset + index, to: offset + index + segment.length, text: segment }));

/** Lookup key for a token: case- and accent-fold so "Buch" and "buch" hit the same entry. */
export const normalizeToken = (token: string): string => token.toLocaleLowerCase().normalize('NFC').replace(/’/g, "'");

/**
 * The longest run of segments starting at `index` that the lookup resolves, or the single segment
 * when nothing longer matches. Longest-first so "パン屋" wins over "パン".
 */
const matchAt = (
  line: { text: string; from: number },
  tokens: Token[],
  index: number,
  lookup: VocabularyLookup,
): { token: Token; span: number; entry?: VocabularyEntry } => {
  for (let span = Math.min(MAX_SEGMENT_SPAN, tokens.length - index); span > 0; span--) {
    const from = tokens[index].from;
    const to = tokens[index + span - 1].to;
    const text = line.text.slice(from - line.from, to - line.from);
    const entry = lookup(normalizeToken(text));
    if (entry) {
      return { token: { from, to, text }, span, entry };
    }
  }

  return { token: tokens[index], span: 1 };
};

/** The token spanning `pos`, or undefined when the position is not inside a word. */
export const tokenAt = (view: EditorView, pos: number, options?: VocabularyOptions): Token | undefined => {
  const line = view.state.doc.lineAt(pos);
  const tokens = segment(line.text, line.from, options?.locale);
  for (let index = 0; index < tokens.length; index++) {
    // Prefer the term the reader would see decorated: hovering "屋" inside "パン屋" should card the
    // compound, not the tail.
    const { token } = options ? matchAt(line, tokens, index, options.lookup) : { token: tokens[index] };
    if (pos >= token.from && pos <= token.to) {
      return token;
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
    el.className = 'italic text-accent-text cursor-help';
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
const buildDecorations = (
  view: EditorView,
  { lookup, locale, translate, highlight }: VocabularyOptions,
): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  if (!translate && !highlight) {
    return builder.finish();
  }

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const tokens = segment(line.text, line.from, locale);
      let index = 0;
      while (index < tokens.length) {
        const { token, span, entry } = matchAt(line, tokens, index, lookup);
        if (entry) {
          builder.add(
            token.from,
            token.to,
            translate ? Decoration.replace({ widget: new TranslationWidget(entry) }) : knownMark,
          );
        }
        index += span;
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
      const token = tokenAt(view, pos, options);
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
