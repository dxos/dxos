//
// Copyright 2024 DXOS.org
//

import { CompletionContext, type CompletionSource } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
// @ts-ignore
import { testTree } from '@lezer/generator/test';
import { expect } from 'chai';
import { spreadsheet } from 'codemirror-lang-spreadsheet';
import { describe, test } from 'vitest';

import { sheetExtension } from './extension';
import { defaultFunctions } from '../../model/functions';

describe('formula parser', () => {
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
    const text = '=SUM';
    const functions = defaultFunctions.filter((fn) => ['ABS', 'SUM'].includes(fn.name));
    const state = EditorState.create({
      doc: text,
      selection: { anchor: 0 },
      extensions: sheetExtension({ functions }),
    });

    const [f] = state.languageDataAt<CompletionSource>('autocomplete', text.length);
    const result = await f(new CompletionContext(state, text.length, true));
    expect(result?.options).to.have.length(1);
  });
});
