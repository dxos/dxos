//
// Copyright 2023 DXOS.org
//

import { StreamLanguage } from '@codemirror/language';

// Simple Monaco language extension.
// https://github.com/codemirror/stream-parser/blob/main/test/test-stream-parser.ts
export const promptLanguage = StreamLanguage.define({
  token: (stream, state) => {
    if (stream.eatSpace()) {
      return null;
    }
    if (stream.match(/^#.*/)) {
      return 'lineComment';
    }
    if (stream.match(/^\{[a-zA-Z_]+}/)) {
      return 'number';
    }
    stream.next();
    return null;
  },
});
