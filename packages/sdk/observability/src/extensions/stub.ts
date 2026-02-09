//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Extension } from '../observability-extension';

export const stubExtension: Extension = {
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
