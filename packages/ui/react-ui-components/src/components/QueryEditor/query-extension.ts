//
// Copyright 2025 DXOS.org
//

import { HighlightStyle, LanguageSupport, LRLanguage, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { EditorState, type Extension, RangeSetBuilder, StateField, type TransactionSpec } from '@codemirror/state';
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
    spacing,
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
              // Atomic at its own edges too, so Backspace against a tag takes the chip rather than a
              // character of the label; typing still grows it, since an insertion at the range's
              // boundary lands outside it.
              //
              // `replace`, not `widget`: a widget is a POINT decoration, so one covering a range that
              // starts at offset 0 paints before that offset's coordinate and the caret draws to its
              // right — pressing Home appeared to leave the caret after the tag.
              deco.add(node.from, node.to, Decoration.replace({ widget: new TagWidget(label, hue), atomic: true }));
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
    // A lone `#` is an error node, not a `Tag` — the grammar needs a label character — so it gets a
    // plain highlight until the first one arrives and the chip takes over.
    for (const range of bareTagRanges(state, tagged)) {
      collected.push({
        from: range.from,
        to: range.to,
        deco: Decoration.mark({ class: mx('rounded-xs px-0.5', getStyles(getHashHue('')).surface) }),
      });
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

/**
 * Keeps typed text from being glued onto a tag chip.
 *
 * Two rules, both applied as follow-up changes so the user's own transaction is left intact:
 * 1. Text typed immediately before a tag is separated from it by a space.
 * 2. An insertion leaves a trailing space at the end of the document, so there is always somewhere to
 *    type that is not adjacent to a chip. Deletions are exempt, or backspace at the end of the
 *    document would only ever delete a space this rule puts straight back.
 */
export const spacing: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) {
    return tr;
  }

  const tagStarts = new Set<number>();
  syntaxTree(tr.startState).iterate({
    enter: (node) => {
      if (node.type.id === QueryDSL.Node.Tag) {
        tagStarts.add(node.from);
      }
    },
  });

  let inserting = false;
  let separator: number | undefined;
  tr.changes.iterChanges((fromA, toA, _fromB, toB, inserted) => {
    if (!inserted.length) {
      return;
    }

    inserting = true;
    // Keyed on `toA`, the offset the inserted text ends against: that covers a replacement whose
    // range ends at the tag as well as a plain insertion, where `fromA` and `toA` are the same.
    if (tagStarts.has(toA) && !/\s$/.test(inserted.toString())) {
      separator = toB;
    }
  });

  const specs: TransactionSpec[] = [tr];
  let text = tr.newDoc.toString();
  if (separator !== undefined) {
    specs.push({ changes: { from: separator, insert: ' ' }, sequential: true });
    text = text.slice(0, separator) + ' ' + text.slice(separator);
  }
  if (inserting && text.length > 0 && !/\s$/.test(text)) {
    specs.push({ changes: { from: text.length, insert: ' ' }, sequential: true });
  }

  return specs;
});

const lineHeight = '30px';

/** The outer box vertically aligns the inner text with content in the outer div. */
const CHIP_OUTER = 'inline-flex h-[28px] align-middle';
const CHIP_INNER = 'inline-flex h-[26px] border rounded-xs';

const container = (classNames: string, ...children: Domino<HTMLElement>[]) => {
  const inner = Domino.of('span')
    .classNames(mx(CHIP_INNER, classNames))
    .append(...children);
  return Domino.of('span').classNames(CHIP_OUTER).append(inner).root;
};

/** A tag chip's parts, keyed by the nesting {@link container} produces. */
const chipClasses = (hue: string) => {
  const { bg, fg, surface } = getStyles(hue);
  return {
    hash: mx('flex items-center px-1 text-black text-xs', bg),
    label: mx('flex items-center px-1 text-sm', surface, fg),
  };
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
      Domino.of('span').classNames(mx('flex items-center px-1 text-description')).text(label),
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
    const { hash, label } = chipClasses(this._hue);
    return container(
      getStyles(this._hue).border,
      Domino.of('span').classNames(hash).text('#'),
      Domino.of('span').classNames(label).text(this._str),
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
          .classNames('flex items-center px-1 text-description text-xs bg-modal-surface first:rounded-l-xs')
          .text(key);
        const valueEl = Domino.of('span').classNames('flex items-center px-1 text-description').text(value);
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
  // NOT `Tag`: it is drawn as a chip, whose own foreground would be fighting a highlight class here.
  'Identifier': t.variableName,
  'PropertyPath': t.propertyName,

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

/** Label characters the grammar admits after `#` (`Tag { "#" $[a-zA-Z0-9_\-]+ }`). */
const TAG_LABEL_CHAR = /[a-zA-Z0-9_-]/;

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
