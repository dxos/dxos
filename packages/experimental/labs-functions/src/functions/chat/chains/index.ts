//
// Copyright 2023 DXOS.org
//

import * as chess from './chess';
import * as knowledge from './knowledge';
import * as list from './list';
import { type SequenceGenerator, type SequenceTest } from '../request';

export const sequences: { test: SequenceTest; generator: SequenceGenerator }[] = [
  {
    test: chess.test,
    generator: chess.generator,
  },
  {
    test: list.test,
    generator: list.generator,
  },
  {
    test: knowledge.test,
    generator: knowledge.generator,
  },
];
