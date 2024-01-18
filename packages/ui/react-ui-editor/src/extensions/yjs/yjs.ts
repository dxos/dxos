//
// Copyright 2024 DXOS.org
//

import { yCollab } from 'y-codemirror.next';
import type * as YP from 'y-protocols/awareness';

import type { YText } from '@dxos/text-model';

import { cursorConverter } from './cursor';
import { Cursor } from '../cursor';

export const yjs = (content: YText, awareness?: YP.Awareness) => [
  Cursor.converter.of(cursorConverter(content)),
  yCollab(content, awareness),
];
