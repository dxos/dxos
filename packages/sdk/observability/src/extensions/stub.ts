//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ObservabilityExtension from '../ObservabilityExtension.ts';

export const stubExtension: ObservabilityExtension.Extension = {
  initialize: () => Effect.succeed(undefined),
  enable: () => Effect.succeed(undefined),
  disable: () => Effect.succeed(undefined),
  flush: () => Effect.succeed(undefined),
  setTags: () => undefined,
  get enabled() {
    return true;
  },
  apis: [],
};
