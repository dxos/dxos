//
// Copyright 2025 DXOS.org
//

import { HighlightStyle, LRLanguage, LanguageSupport, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { type SyntaxNodeRef } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';
import JSON5 from 'json5';

import { QueryDSL } from '@dxos/echo-query';
import { Domino } from '@dxos/react-ui-editor';

export type QueryOptions = {};

/**
 * Create a CodeMirror extension for the query language with syntax highlighting.
 */
export const query = (_options: Partial<QueryOptions> = {}): Extension => {
  return [new LanguageSupport(queryLanguage), syntaxHighlighting(queryHighlightStyle), decorations()];
};

/**
 * Decorations
 */
const decorations = (): Extension => {
  const buildDecorations = (state: EditorState) => {
    const isInside = (node: SyntaxNodeRef) =>
      state.selection.main.from >= node.from &&
      state.selection.main.to <= node.to &&
      state.selection.main.from > 0 &&
      state.selection.main.from < state.doc.length;

    const deco = new RangeSetBuilder<Decoration>();
    const atomicDeco = new RangeSetBuilder<Decoration>();
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

            const nodeIdent = node.node.getChild(QueryDSL.Node.Identifier);
            if (nodeIdent) {
              const ident = state.sliceDoc(nodeIdent.from, nodeIdent.to);
              deco.add(
                node.from,
                node.to,
                Decoration.widget({
                  widget: new TypeWidget(ident),
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

          case QueryDSL.Node.And:
          case QueryDSL.Node.Or: {
            atomicDeco.add(
              node.from,
              node.to,
              Decoration.mark({
                class: 'pie-1',
              }),
            );
          }
        }
      },
    });

    return { deco: deco.finish(), atomicDeco: atomicDeco.finish() };
  };

  return [
    StateField.define<{ deco: DecorationSet; atomicDeco: DecorationSet }>({
      create: (state) => buildDecorations(state),
      update: (deco, tr) => {
        if (tr.docChanged || tr.newSelection) {
          return buildDecorations(tr.state);
        }

        return deco;
      },
      provide: (field) => [
        EditorView.decorations.from(field, (value) => value.deco),
        EditorView.atomicRanges.of((view) => view.state.field(field).atomicDeco),
      ],
    }),
  ];
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
    return Domino.of('span')
      .classNames('inline-flex items-stretch border border-separator rounded-sm')
      .child(
        Domino.of('span')
          .text('type')
          .classNames('flex items-center text-xs pis-1 pie-1 rounded-l-[0.2rem] bg-separator'),
        Domino.of('span').text(label).classNames('leading-[22px] pis-1 pie-1 pb-[1px]'),
      )
      .build();
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
    return Domino.of('span')
      .classNames('inline-flex items-stretch border border-separator divide-x divide-separator rounded-sm')
      .child(
        ...this._entries.map(([key, value]) =>
          Domino.of('span').classNames('pis-1 pie-1').child(
            //
            Domino.of('span').classNames('text-infoText').text(key),
            Domino.of('span').classNames('pis-1').text(value),
          ),
        ),
      )
      .build();
  }
}

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
  PropertyKey: t.propertyName,

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
  { tag: t.keyword, class: 'text-blue-500' },
  { tag: t.string, class: 'text-orange-500' },
  { tag: t.number, class: 'text-green-500' },
  { tag: t.bool, class: 'text-green-500' },
  { tag: t.null, class: 'text-neutral-500' },
  { tag: t.attributeName, class: 'text-blue-500' },
  { tag: t.variableName, class: 'text-teal-500' },
  { tag: t.propertyName, class: 'text-teal-500' },
  { tag: t.definitionOperator, class: 'text-subdued' },
  { tag: t.separator, class: 'text-subdued' },
  { tag: t.derefOperator, class: 'text-subdued' },
  { tag: t.brace, class: 'text-subdued' },
  { tag: t.squareBracket, class: 'text-subdued' },
  { tag: t.operator, class: 'text-subdued' },
  { tag: t.paren, class: 'text-yellow-500' },
]);
