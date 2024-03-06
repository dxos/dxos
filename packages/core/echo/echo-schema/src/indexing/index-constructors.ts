//
// Copyright 2024 DXOS.org
//

import { IndexSchema } from './index-schema';
import { type IndexKind, type IndexStaticProps } from './types';

export const IndexConstructors: { [key in IndexKind['kind']]?: IndexStaticProps } = {
  SCHEMA_MATCH: IndexSchema,
};
