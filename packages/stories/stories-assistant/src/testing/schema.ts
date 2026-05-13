//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Feed, Ref, Type } from '@dxos/echo';

export const ResearchInputQueue = Schema.Struct({
  feed: Ref.Ref(Feed.Feed),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.researchInputQueue',
    version: '0.1.0',
  }),
);
