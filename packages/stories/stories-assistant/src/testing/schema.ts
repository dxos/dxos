//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Feed, Ref, Type } from '@dxos/echo';

export const ResearchInputQueue = Type.makeObject(DXN.make('org.dxos.type.researchInputQueue', '0.1.0'))(
  Schema.Struct({
    feed: Ref.Ref(Feed.Feed),
  }),
);
