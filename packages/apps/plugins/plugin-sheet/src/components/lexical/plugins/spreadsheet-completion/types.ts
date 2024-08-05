//
// Copyright 2024 DXOS.org
//

import { type Spread, type SerializedTextNode } from 'lexical';

export type SerializedCodeCompletionTextNode = Spread<
  {
    text: string;
    type: 'code-completion-item';
    version: 1;
  },
  SerializedTextNode
>;
