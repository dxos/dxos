//
// Copyright 2024 DXOS.org
//

import { CompletionContext, type CompletionSource } from '@codemirror/autocomplete';
import { type LRLanguage } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { testTree } from '@lezer/generator/test';
import { expect } from 'chai';
import { spreadsheet } from 'codemirror-lang-spreadsheet';
import { HyperFormula } from 'hyperformula';

import { describe, test } from '@dxos/test';

// https://lezer-playground.vercel.app

describe('formula language', () => {
  const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
  const { extension, language } = spreadsheet({});
  const { parser } = language as LRLanguage;

  // https://lezer.codemirror.net/docs/ref/#common.Parsing
  test('parser', () => {
    {
      const result = parser.parse('SUM(A1)');
      testTree(
        result,
        'Program(FunctionCall(Function,Arguments(Argument(Reference(ReferenceItem(CellToken)))),CloseParen))',
      );
    }
    {
      const result = parser.parse('SUM(A1:A3)');
      testTree(
        result,
        'Program(FunctionCall(Function,Arguments(Argument(Reference(ReferenceFunctionCall(RangeToken(Reference(ReferenceItem(CellToken)),Reference(ReferenceItem(CellToken))))))),CloseParen))',
      );
    }
  });

  test('lang', () => {
    const spreadsheet = language.data.of({
      autocomplete: (context: CompletionContext) => {
        const match = context.matchBefore(/\w*/);
        if (!match || match.from === match.to) {
          return [];
        }

        return hf.getRegisteredFunctionNames().filter((name) => name.startsWith(match.text));
      },
    });

    const text = 'SUM';
    const state = EditorState.create({
      doc: text,
      selection: { anchor: 0 },
      extensions: [extension, spreadsheet],
    });

    const [f] = state.languageDataAt<CompletionSource>('autocomplete', text.length);
    const result = f(new CompletionContext(state, text.length, true));
    expect(result).to.have.length.gt(0);
  });
});
