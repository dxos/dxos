//
// Copyright 2025 DXOS.org
//

import { HighlightStyle, LanguageSupport, LRLanguage, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { type SyntaxNodeRef } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';
import JSON5 from 'json5';

import { Tag } from '@dxos/echo';
import { QueryDSL } from '@dxos/echo-query';
import { Domino } from '@dxos/ui';
import { type CompletionContext, focus, focusField, staticCompletion, typeahead } from '@dxos/ui-editor';
import { getHashHue, getStyles, mx } from '@dxos/ui-theme';

export type QueryOptions = {
  tags?: Tag.Map;
};

/**
 * Create a CodeMirror extension for the query language with syntax highlighting.
 */
export const query = ({ tags }: QueryOptions = {}): Extension => {
  return [
    new LanguageSupport(queryLanguage),
    syntaxHighlighting(queryHighlightStyle),
    decorations({ tags }),
    typeahead({
      onComplete: ({ line }: CompletionContext) => {
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length > 0) {
          // TODO(burdon): Get suggestion from parser.
          return staticCompletion(['type:', 'AND', 'OR', 'NOT'])({ line });
        }
      },
    }),
    focus,
    styles,
  ];
};

/**
 * The extension's decorations for a given state.
 *
 * Exported as a pure function of `(state, options)` so the atomicity rules — which govern whether a
 * tag can still be edited — are testable without mounting an `EditorView`.
 */
export const buildQueryDecorations = (state: EditorState, { tags }: QueryOptions = {}): DecorationSet => {
  {
    const hasFocus = state.field(focusField);
    const isInside = (node: SyntaxNodeRef) => {
      const range = intersectRanges(state.selection.main, node);
      return hasFocus && range && (state.selection.main.from > 0 || range.to - range.from > 0);
    };

    // Collected rather than fed straight to a `RangeSetBuilder`, which demands ascending `from`:
    // the bare-`#` ranges below come from a document scan and interleave with the tree's own.
    const collected: { from: number; to: number; deco: Decoration }[] = [];
    const deco = {
      add: (from: number, to: number, value: Decoration) => collected.push({ from, to, deco: value }),
    };
    const tagged: Range[] = [];
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.type.id === QueryDSL.Node.Tag) {
          tagged.push({ from: node.from, to: node.to });
        }
        switch (node.type.name) {
          case '(':
          case ')': {
            deco.add(
              node.from,
              node.to,
              Decoration.mark({
                class: 'px-1',
              }),
            );
            break;
          }

          case '=': {
            deco.add(
              node.from,
              node.to,
              Decoration.mark({
                class: 'text-subdued',
              }),
            );
            break;
          }
        }

        switch (node.type.id) {
          case QueryDSL.Node.TypeFilter: {
            if (isInside(node)) {
              break;
            }

            const identifier = node.node.getChild(QueryDSL.Node.Identifier);
            if (identifier) {
              deco.add(
                node.from,
                node.to,
                Decoration.widget({
                  widget: new TypeWidget(state.sliceDoc(identifier.from, identifier.to)),
                }),
              );
            }
            break;
          }

          case QueryDSL.Node.TagFilter: {
            const tagNode = node.node.getChild(QueryDSL.Node.Tag);
            if (tagNode) {
              const label = state.sliceDoc(tagNode.from + 1, tagNode.to);
              const tag = Tag.findTagByLabel(tags, label);
              const hue = tag?.hue ?? getHashHue(tag?.id ?? label);
              // Atomic only once the tag is TERMINATED by whitespace. An atomic range cannot be
              // edited character-by-character, so covering a label the user is still typing would
              // swallow their next keystroke; by the time the terminating space exists the caret has
              // already moved past the tag, so the chip never sits under it. Backspace then removes
              // the tag whole, which is how a chip should behave.
              if (isTerminated(state, node.to)) {
                // `replace`, not `widget`: a widget is a POINT decoration, so one covering a range
                // that starts at offset 0 paints before that offset's coordinate and the caret draws
                // to its right — pressing Home appeared to leave the caret after the tag. `replace`
                // states that the range becomes the chip, which resolves the boundary.
                deco.add(node.from, node.to, Decoration.replace({ widget: new TagWidget(label, hue), atomic: true }));
              } else {
                for (const mark of tagMarks(node.from, node.to, hue)) {
                  deco.add(mark.from, mark.to, mark.deco);
                }
              }
            }
            break;
          }

          case QueryDSL.Node.ObjectLiteral: {
            if (isInside(node)) {
              break;
            }

            try {
              const props = JSON5.parse(state.sliceDoc(node.from, node.to));
              if (props) {
                deco.add(
                  node.from,
                  node.to,
                  Decoration.widget({
                    widget: new ObjectWidget(props),
                  }),
                );
              }
            } catch {
              // Ignore malformed JSON.
            }
            break;
          }

          case QueryDSL.Node.Not:
          case QueryDSL.Node.And:
          case QueryDSL.Node.Or: {
            deco.add(
              node.from,
              node.to,
              Decoration.mark({
                class: 'pe-1 uppercase',
                atomic: true,
              }),
            );
            break;
          }

          case QueryDSL.Node.ArrowRight:
          case QueryDSL.Node.ArrowLeft: {
            deco.add(
              node.from,
              node.to,
              Decoration.widget({
                widget: new SymbolWidget(node.type.id === QueryDSL.Node.ArrowRight ? '\u2192' : '\u2190'),
                atomic: true,
              }),
            );
            break;
          }

          // default: {
          //   console.log(node.type.name);
          // }
        }
      },
    });

    // A `#` with no label yet parses as an error, not a `Tag`, so the tree cannot decorate it — but
    // the affordance has to appear on the keystroke that opens the tag, not once it is valid.
    for (const range of bareTagRanges(state, tagged)) {
      const label = state.sliceDoc(range.from + 1, range.to);
      const tag = Tag.findTagByLabel(tags, label);
      // Resolved the same way as a complete tag, so the colour does not jump when the parser starts
      // accepting the label.
      collected.push(...tagMarks(range.from, range.to, tag?.hue ?? getHashHue(tag?.id ?? label)));
    }

    const builder = new RangeSetBuilder<Decoration>();
    // Equal starts sort WIDEST first so an enclosing mark (the chip's border) nests the inner ones.
    collected.sort((a, b) => a.from - b.from || b.to - a.to);
    for (const { from, to, deco } of collected) {
      builder.add(from, to, deco);
    }

    return builder.finish();
  }
};

/**
 * Decorations
 */
const decorations = ({ tags }: QueryOptions): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: (state) => buildQueryDecorations(state, { tags }),
      update: (deco, tr) => {
        if (tr.docChanged || tr.newSelection) {
          return buildQueryDecorations(tr.state, { tags });
        }

        return deco;
      },
      provide: (field) => [
        EditorView.decorations.from(field),
        EditorView.atomicRanges.of((view) => {
          const builder = new RangeSetBuilder<Decoration>();
          const cursor = view.state.field(field).iter();
          while (cursor.value) {
            if (cursor.value.spec.atomic) {
              builder.add(cursor.from, cursor.to, cursor.value);
            }
            cursor.next();
          }

          return builder.finish();
        }),
      ],
    }),
  ];
};

const lineHeight = '30px';

/**
 * NOTE: The outer container vertically aligns the inner text with content in the outer div.
 */
const container = (classNames: string, ...children: Domino<HTMLElement>[]) => {
  const inner = Domino.of('span')
    .classNames(mx('inline-flex h-[26px] border rounded-xs', classNames))
    .append(...children);
  return Domino.of('span').classNames('inline-flex h-[28px] align-middle').append(inner).root;
};

/**
 * TypeKeyword:Identifier
 */
class TypeWidget extends WidgetType {
  constructor(private readonly _identifier: string) {
    super();
  }

  override ignoreEvent() {
    return false;
  }

  override eq(other: this) {
    return this._identifier === other._identifier;
  }

  override toDOM() {
    const label: string = this._identifier.split(/\W/).at(-1)!;
    return container(
      'border-sky-500',
      Domino.of('span').classNames(mx('flex items-center px-1 text-black text-xs bg-sky-500')).text('type'),
      Domino.of('span').classNames(mx('flex items-center px-1 text-subdued')).text(label),
    );
  }
}

/**
 * Tag
 */
class TagWidget extends WidgetType {
  constructor(
    private readonly _str: string,
    private readonly _hue: string,
  ) {
    super();
  }

  override eq(other: this) {
    return this._str === other._str;
  }

  override toDOM() {
    const { bg: fill, border, surface } = getStyles(this._hue);
    return container(
      border,
      Domino.of('span').classNames(mx('flex items-center px-1 text-black text-xs', fill)).text('#'),
      Domino.of('span')
        .classNames(mx('flex items-center px-1 text-subdued text-sm rounded-r-[3px]', surface))
        .text(this._str),
    );
  }
}

/**
 * { type: "value" }
 */
class ObjectWidget extends WidgetType {
  private readonly _entries: [string, any][];
  private readonly _json: string;

  constructor(private readonly _props: any) {
    super();
    this._entries = Object.entries(this._props);
    this._json = JSON.stringify(this._props);
  }

  override ignoreEvent() {
    return false;
  }

  override eq(other: this) {
    return this._json === other._json;
  }

  override toDOM() {
    return container(
      'border-separator divide-x divide-separator',
      ...this._entries.map(([key, value]) => {
        const keyEl = Domino.of('span')
          .classNames('flex items-center px-1 text-subdued text-xs bg-modal-surface first:rounded-l-[3px]')
          .text(key);
        const valueEl = Domino.of('span').classNames('flex items-center px-1 text-subdued').text(value);
        return Domino.of('span').classNames('inline-flex items-stretch').append(keyEl, valueEl);
      }),
    );
  }
}

/**
 * Symbol
 */
class SymbolWidget extends WidgetType {
  constructor(private readonly _str: string) {
    super();
  }

  override eq(other: this) {
    return this._str === other._str;
  }

  override toDOM() {
    return Domino.of('span').text(this._str).root;
  }
}

const styles = EditorView.theme({
  '.cm-line': {
    lineHeight,
  },
  // Match the standard Input block size (md density): 2.5rem, 2rem on pointer-fine devices.
  '.cm-scroller': {
    alignItems: 'center',
    minHeight: '2.5rem',
  },
  '@media (pointer: fine)': {
    '.cm-scroller': {
      minHeight: '2rem',
    },
  },
});

/**
 * Define syntax highlighting tags for the query language.
 */
const queryHighlighting = styleTags({
  // Keywords
  'Not And Or': t.keyword,
  'TypeKeyword': t.attributeName,

  // Literals
  'String': t.string,
  'Number': t.number,
  'Boolean': t.bool,
  'Null': t.null,

  // Identifiers
  'Identifier': t.variableName,
  'PropertyPath': t.propertyName,
  'Tagname': t.variableName,

  // Punctuation
  '{ }': t.brace,
  '[ ]': t.squareBracket,
  '( )': t.paren,
  ':': t.definitionOperator,
  ',': t.separator,
  '.': t.derefOperator,
});

/**
 * Create the query language with the parser and highlighting.
 */
const queryLanguage = LRLanguage.define({
  parser: QueryDSL.Parser.configure({
    props: [queryHighlighting],
    strict: false,
  }),
  languageData: {
    commentTokens: { line: '//' },
  },
});

/**
 * Define a custom highlight style for the query language.
 */
const queryHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, class: 'text-blue-text' },
  { tag: t.string, class: 'text-orange-text' },
  { tag: t.number, class: 'text-green-text' },
  { tag: t.bool, class: 'text-green-text' },
  { tag: t.null, class: 'text-neutral-text' },
  { tag: t.attributeName, class: 'text-blue-text' },
  { tag: t.variableName, class: 'text-teal-text' },
  { tag: t.propertyName, class: 'text-teal-text' },
  { tag: t.definitionOperator, class: 'text-subdued' },
  { tag: t.separator, class: 'text-subdued' },
  { tag: t.derefOperator, class: 'text-subdued' },
  { tag: t.brace, class: 'text-subdued' },
  { tag: t.squareBracket, class: 'text-subdued' },
  { tag: t.operator, class: 'text-subdued' },
  { tag: t.paren, class: 'text-amber-text' },
]);

type Range = { from: number; to: number };
function intersectRanges(a: Range, b: Range): Range | null {
  const start = Math.max(a.from, b.from);
  const end = Math.min(a.to, b.to);
  return start <= end ? { from: start, to: end } : null;
}

/** Line-height giving a mark-drawn chip the same box as {@link TagWidget}'s `h-[26px]`. */
const CHIP_LEADING = 'leading-[24px]';

/** Label characters the grammar admits after `#` (`Tag { "#" $[a-zA-Z0-9_\-]+ }`). */
const TAG_LABEL_CHAR = /[a-zA-Z0-9_-]/;

/**
 * Marks drawing an UNFINISHED tag as the chip it is about to become.
 *
 * A widget cannot serve here: replacing the range would make the label uneditable mid-word, which is
 * the whole reason an unterminated tag stays non-atomic. So the chip's two-part shape — `#` badge,
 * then label — is painted over the live characters instead, matching {@link TagWidget} so the tag does
 * not visibly change form when the terminating space finally arrives.
 */
const tagMarks = (from: number, to: number, hue: string): { from: number; to: number; deco: Decoration }[] => {
  const { bg: fill, border, surface } = getStyles(hue);
  const marks = [
    // Enclosing border first; `buildQueryDecorations` sorts equal starts widest-first so it nests.
    // `inline-block` + `leading`, NOT the widget's `inline-flex`: these spans wrap live, editable
    // text, and turning it into an anonymous flex item moves the caret coordinates inside the label.
    // The chip's height is matched through line-height instead.
    {
      from,
      to,
      deco: Decoration.mark({ class: mx('inline-block align-middle border rounded-xs', CHIP_LEADING, border) }),
    },
    { from, to: from + 1, deco: Decoration.mark({ class: mx('px-1 text-black text-xs', fill) }) },
  ];
  if (to > from + 1) {
    marks.push({
      from: from + 1,
      to,
      // `text-sm` matches the widget's label; without it the in-progress form rendered a size larger.
      deco: Decoration.mark({ class: mx('px-1 text-subdued text-sm rounded-r-[3px]', surface) }),
    });
  }

  return marks;
};

/**
 * Whether a token is closed off by whitespace — what separates a tag the user has finished from one
 * they are still typing, and so whether its decoration may be atomic.
 *
 * The end of the document deliberately does NOT terminate: that is exactly where the caret sits while
 * a label is being typed, and going atomic there would swallow the next keystroke.
 */
const isTerminated = (state: EditorState, to: number): boolean =>
  to < state.doc.length && /\s/.test(state.sliceDoc(to, to + 1));

/**
 * Ranges of an in-progress tag — a `#` the parser has not yet accepted as a {@link QueryDSL.Node.Tag},
 * because the grammar requires at least one label character after it. Skips offsets the tree already
 * claimed, and any `#` inside a string, where it is content rather than a tag.
 */
const bareTagRanges = (state: EditorState, tagged: readonly Range[]): Range[] => {
  const ranges: Range[] = [];
  const text = state.sliceDoc();
  const covered = (index: number) => tagged.some(({ from, to }) => index >= from && index < to);
  for (let index = text.indexOf('#'); index !== -1; index = text.indexOf('#', index + 1)) {
    if (covered(index) || syntaxTree(state).resolveInner(index, 1).type.id === QueryDSL.Node.String) {
      continue;
    }
    let end = index + 1;
    while (end < text.length && TAG_LABEL_CHAR.test(text[end])) {
      end++;
    }
    ranges.push({ from: index, to: end });
  }

  return ranges;
};
