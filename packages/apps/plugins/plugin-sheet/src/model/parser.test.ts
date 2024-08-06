//
// Copyright 2024 DXOS.org
//

import { LRLanguage } from '@codemirror/language';

import { describe, test } from '@dxos/test';

import { parser } from './parser';

// import { expect } from 'chai';

// https://lezer-playground.vercel.app/

describe('formula language  ', () => {
  test('parser', () => {
    console.log('');
    const lang = LRLanguage.define({ parser });
    const result = lang.parser.parse('SUM(A1, A1:A3)');
    // console.log(JSON.stringify({ result }, undefined, 2));
    console.log('ok333');
  });

  // test.skip('lang', () => {
  //   const extension = lang.data.of({
  //     autocomplete: () => {
  //       console.log('?');
  //       return [];
  //     },
  //   });
  //
  //   const state = EditorState.create({
  //     doc: '=SU',
  //     selection: { anchor: 0 },
  //     extensions: [extension],
  //   });
  //
  //   const result = state.languageDataAt<CompletionSource>('autocomplete', 0);
  //   console.log('>>', result);
  // });
});
