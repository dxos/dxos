//
// Copyright 2025 DXOS.org
//

import { HighlightStyle, LRLanguage, LanguageSupport, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { type SyntaxNodeRef } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';
import JSON5 from 'json5';

import { Tag } from '@dxos/echo';
import { QueryDSL } from '@dxos/echo-query';
import { Domino } from '@dxos/react-ui';
import { type CompoetionContext, focus, focusField, staticCompletion, typeahead } from '@dxos/react-ui-editor';
import { getHashHue, getStyles } from '@dxos/ui-theme';

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
      onComplete: ({ line }: CompoetionContext) => {
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
 * Decorations
 */
const decorations = ({ tags }: QueryOptions): Extension => {
  const buildDecorations = (state: EditorState) => {
    const hasFocus = state.field(focusField);
    const isInside = (node: SyntaxNodeRef) => {
      const range = intersectRanges(state.selection.main, node);
      return hasFocus && range && (state.selection.main.from > 0 || range.to - range.from > 0);
    };

    const deco = new RangeSetBuilder<Decoration>();
    syntaxTree(state).iterate({
      enter: (node) => {
        switch (node.type.name) {
          case '(':
          case ')': {
            deco.add(
              node.from,
              node.to,
              Decoration.mark({
                class: 'pli-1',
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
              deco.add(
                node.from,
                node.to,
                Decoration.widget({
                  widget: new TagWidget(label, hue),
                  atomic: true,
                }),
              );
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
                class: 'pie-1 uppercase',
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

    return deco.finish();
  };

  return [
    StateField.define<DecorationSet>({
      create: (state) => buildDecorations(state),
      update: (deco, tr) => {
        if (tr.docChanged || tr.newSelection) {
          return buildDecorations(tr.state);
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
  return Domino.of('span')
    .classNames('inline-flex bs-[28px] align-middle')
    .children(
      Domino.of('span')
        .classNames(['inline-flex bs-[26px] border rounded-sm', classNames])
        .children(...children),
    )
    .build();
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
      Domino.of('span').classNames(['flex items-center pli-1 text-black text-xs bg-sky-500']).text('type'),
      Domino.of('span').classNames(['flex items-center pli-1 text-subdued']).text(label),
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
    const { bg, border, surface } = getStyles(this._hue);
    return container(
      border,
      Domino.of('span').classNames(['flex items-center pli-1 text-black text-xs', bg]).text('#'),
      Domino.of('span')
        .classNames(['flex items-center pli-1 text-subdued text-sm rounded-r-[3px]', surface])
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
      ...this._entries.map(([key, value]) =>
        Domino.of('span')
          .classNames('inline-flex items-stretch')
          .children(
            Domino.of('span')
              .classNames('flex items-center pli-1 text-subdued text-xs bg-modalSurface first:rounded-l-[3px]')
              .text(key),
            Domino.of('span').classNames('flex items-center pli-1 text-subdued').text(value),
          ),
      ),
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
    return Domino.of('span').text(this._str).build();
  }
}

const styles = EditorView.theme({
  '.cm-line': {
    lineHeight,
  },
});

/**
 * Define syntax highlighting tags for the query language.
 */
const queryHighlighting = styleTags({
  // Keywords
  'Not And Or': t.keyword,
  TypeKeyword: t.attributeName,

  // Literals
  String: t.string,
  Number: t.number,
  Boolean: t.bool,
  Null: t.null,

  // Identifiers
  Identifier: t.variableName,
  PropertyPath: t.propertyName,
  Tagname: t.variableName,

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
  { tag: t.keyword, class: 'text-blueText' },
  { tag: t.string, class: 'text-orangeText' },
  { tag: t.number, class: 'text-greenText' },
  { tag: t.bool, class: 'text-greenText' },
  { tag: t.null, class: 'text-neutralText' },
  { tag: t.attributeName, class: 'text-blueText' },
  { tag: t.variableName, class: 'text-tealText' },
  { tag: t.propertyName, class: 'text-tealText' },
  { tag: t.definitionOperator, class: 'text-subdued' },
  { tag: t.separator, class: 'text-subdued' },
  { tag: t.derefOperator, class: 'text-subdued' },
  { tag: t.brace, class: 'text-subdued' },
  { tag: t.squareBracket, class: 'text-subdued' },
  { tag: t.operator, class: 'text-subdued' },
  { tag: t.paren, class: 'text-amberText' },
]);

type Range = { from: number; to: number };
function intersectRanges(a: Range, b: Range): Range | null {
  const start = Math.max(a.from, b.from);
  const end = Math.min(a.to, b.to);
  return start <= end ? { from: start, to: end } : null;
}
