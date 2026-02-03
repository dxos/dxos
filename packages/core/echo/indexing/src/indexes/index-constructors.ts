//
// Copyright 2024 DXOS.org
//

import { IndexKind } from '@dxos/protocols/buf/dxos/echo/indexing_pb';

import { type IndexStaticProps } from '../types';

import { IndexGraph } from './index-graph';
import { IndexSchema } from './index-schema';
import { IndexText } from './index-text';
import { IndexVector } from './index-vector';

export const IndexConstructors: { [key in IndexKind['kind']]?: IndexStaticProps } = {
  [IndexKind.Kind.SCHEMA_MATCH]: IndexSchema,
  [IndexKind.Kind.GRAPH]: IndexGraph,
  [IndexKind.Kind.VECTOR]: IndexVector,
  [IndexKind.Kind.FULL_TEXT]: IndexText,
};
