//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { BloggerCapabilities, type Publisher } from '@dxos/plugin-blogger/types';

import { TypefullyApi } from '#services';

export default Capability.makeModule(() => {
  // Explicit type keeps the emitted declaration portable (TS2883).
  const service: Publisher.PublisherService = TypefullyApi.makeTypefullyPublisherService();
  return Effect.succeed(Capability.contributes(BloggerCapabilities.PublisherService, service));
});
