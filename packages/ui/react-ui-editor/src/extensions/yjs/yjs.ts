//
// Copyright 2024 DXOS.org
//

import { yCollab } from 'y-codemirror.next';
import type * as Y from 'y-protocols/awareness';

import type { YText } from '@dxos/text-model';

import { cursorConverter } from './cursor';
import { CursorConverter } from '../../util';

export const yjs = (content: YText, awareness?: Y.Awareness) => [
  yCollab(content, awareness),
  CursorConverter.of(cursorConverter(content)),
];
