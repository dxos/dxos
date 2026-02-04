//
// Copyright 2024 DXOS.org
//

import { IndexKind_Kind } from '@dxos/protocols/buf/dxos/echo/indexing_pb';

import { type IndexStaticProps } from '../types';

import { IndexGraph } from './index-graph';
import { IndexSchema } from './index-schema';
import { IndexText } from './index-text';
import { IndexVector } from './index-vector';

export const IndexConstructors: { [key in IndexKind_Kind]?: IndexStaticProps } = {
  [IndexKind_Kind.SCHEMA_MATCH]: IndexSchema,
  [IndexKind_Kind.GRAPH]: IndexGraph,
  [IndexKind_Kind.VECTOR]: IndexVector,
  [IndexKind_Kind.FULL_TEXT]: IndexText,
};
