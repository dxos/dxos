//
// Copyright 2023 DXOS.org
//

import * as chess from './chess';
import * as list from './list';
import * as rag from './rag';
import { type SequenceGenerator, type SequenceTest } from '../request';

export const sequences: { id: string; test: SequenceTest; generator: SequenceGenerator }[] = [
  {
    id: 'chess',
    test: chess.test,
    generator: chess.generator,
  },
  {
    id: 'list',
    test: list.test,
    generator: list.generator,
  },
  {
    id: 'RAG',
    test: rag.test,
    generator: rag.generator,
  },
];
