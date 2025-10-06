//
// Copyright 2025 DXOS.org
//

import { type CompletionContext, autocompletion } from '@codemirror/autocomplete';
import { HighlightStyle, LRLanguage, LanguageSupport, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { type SyntaxNodeRef } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';
import JSON5 from 'json5';

import { type Space } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { QueryDSL } from '@dxos/echo-query';
import { Domino } from '@dxos/react-ui';
import { focus, focusField } from '@dxos/react-ui-editor';
import { getHashColor } from '@dxos/react-ui-theme';

export type QueryOptions = {
  space?: Space;
};

/**
 * Create a CodeMirror extension for the query language with syntax highlighting.
 */
export const query = ({ space }: Partial<QueryOptions> = {}): Extension => {
  const parser = QueryDSL.Parser.configure({ strict: false });

  return [
    new LanguageSupport(queryLanguage),
    syntaxHighlighting(queryHighlightStyle),
    decorations(),
    autocompletion({
      activateOnTyping: true,
      override: [
        async (context: CompletionContext) => {
          const tree = parser.parse(context.state.sliceDoc());
          const node = tree.cursorAt(context.pos, -1).node;

          switch (node.parent?.type.id) {
            case QueryDSL.Node.TypeFilter: {
              let range = undefined;
              if (node?.type.id === QueryDSL.Node.Identifier) {
                range = { from: node.from, to: node.to };
              } else if (node?.type.name === ':') {
                range = { from: node.from + 1 };
              }

              if (range) {
                const schema = space?.db.graph.schemaRegistry.schemas ?? [];
                return {
                  ...range,
                  filter: true,
                  options: schema.map((schema) => ({ label: Type.getTypename(schema) })),
                };
              }
            }
          }

          return null;
        },
      ],
    }),
    focus,
    styles,
  ];
};

/**
 * Decorations
 */
const decorations = (): Extension => {
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
                class: 'pis-1 pie-1',
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
            const tag = node.node.getChild(QueryDSL.Node.Tag);
            if (tag) {
              deco.add(
                node.from,
                node.to,
                Decoration.widget({
                  widget: new TagWidget(state.sliceDoc(tag.from + 1, tag.to)),
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
 * Tag
 */
class TagWidget extends WidgetType {
  constructor(private readonly _str: string) {
    super();
  }

  override eq(other: this) {
    return this._str === other._str;
  }

  override toDOM() {
    const { bg, border } = getHashColor(this._str);
    return container(
      border,
      Domino.of('span').classNames(['flex items-center text-xs pis-1 pie-1 text-black', bg]).text('#'),
      Domino.of('span').classNames(['flex items-center pis-1 pie-1 text-subdued']).text(this._str),
    );
  }
}

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
      'border-separator',
      Domino.of('span').classNames(['flex items-center text-xs font-thin pis-1 pie-1 bg-separator']).text('type'),
      Domino.of('span').classNames(['flex items-center pis-1 pie-1 text-infoText']).text(label),
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
          .classNames('inline-flex items-center pis-1 pie-1')
          .children(
            Domino.of('span')
              .classNames('text-xs text-subdued mt-[1px]')
              .text(key + ':'),
            Domino.of('span').classNames('text-infoText pis-1').text(value),
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
