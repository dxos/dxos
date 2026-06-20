//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Feed, Ref, Type } from '@dxos/echo';

export const ResearchInputQueue = Schema.Struct({
  feed: Ref.Ref(Feed.Feed),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.researchInputQueue', '0.1.0')));
