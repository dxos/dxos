//
// Copyright 2024 DXOS.org
//

import { CompletionContext, type CompletionSource } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
// @ts-ignore
import { testTree } from '@lezer/generator/test';
import { expect } from 'chai';
import { spreadsheet } from 'codemirror-lang-spreadsheet';
import { HyperFormula } from 'hyperformula';

import { describe, test } from '@dxos/test';

import { sheetExtension } from './extension';
// import { spreadsheetLanguage } from './parser';

describe('formula parser', () => {
  const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
  const {
    language: { parser },
  } = spreadsheet({});

  // https://lezer-playground.vercel.app
  // https://lezer.codemirror.net/docs/ref/#common.Parsing
  test('parser', () => {
    const result = parser.parse('SUM(A1)');
    testTree(
      result,
      'Program(FunctionCall(Function,Arguments(Argument(Reference(ReferenceItem(CellToken)))),CloseParen))',
    );
  });

  test('autocomplete', async () => {
    const text = 'SUM';
    const state = EditorState.create({
      doc: text,
      selection: { anchor: 0 },
      extensions: sheetExtension({ functions: hf.getRegisteredFunctionNames() }),
    });

    const [f] = state.languageDataAt<CompletionSource>('autocomplete', text.length);
    const result = await f(new CompletionContext(state, text.length, true));
    expect(result?.options).to.have.length.gt(0);
  });

  test('lang', () => {
    // console.log(spreadsheetLanguage);
  });
});
