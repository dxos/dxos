//
// Copyright 2023 DXOS.org
//

import { StreamLanguage } from '@codemirror/language';

export const VAR_NAME = /\{([\w_]+)}/;

// Simple Monaco language extension.
// https://github.com/codemirror/stream-parser/blob/main/test/test-stream-parser.ts
export const promptLanguage = StreamLanguage.define({
  token: (stream) => {
    if (stream.eatSpace()) {
      return null;
    }
    if (stream.match(/^#.*/)) {
      return 'lineComment';
    }
    if (stream.match(/^-+$/)) {
      return 'lineComment';
    }
    if (stream.match(VAR_NAME)) {
      return 'number';
    }
    stream.next();
    return null;
  },
});
