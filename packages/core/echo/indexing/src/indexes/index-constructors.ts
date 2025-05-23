//
// Copyright 2024 DXOS.org
//

import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';

import { IndexGraph } from './index-graph';
import { IndexSchema } from './index-schema';
import { type IndexStaticProps } from '../types';

export const IndexConstructors: { [key in IndexKind['kind']]?: IndexStaticProps } = {
  [IndexKind.Kind.SCHEMA_MATCH]: IndexSchema,
  [IndexKind.Kind.GRAPH]: IndexGraph,
};
