//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

// TODO(dmaretskyi): Right now I'm reusing the Queue annotation instead.
export const SubscriptionTarget = Annotation.make({
  id: 'dxos.org/annotation/SubscriptionTarget',
  schema: Schema.Struct({
    /**
     * JSON path to the queue property.
     */
    queueGetter: Schema.String,
  }),
});
