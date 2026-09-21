//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as BloggerCapabilities from '@dxos/plugin-blogger/BloggerCapabilities';
import * as BloggerEvents from '@dxos/plugin-blogger/BloggerEvents';
import type * as Publisher from '@dxos/plugin-blogger/Publisher';

import { TypefullyApi } from '#services';

export const PublisherService = Capability.makeModule(
  'TypefullyPublisherService',
  { provides: [BloggerCapabilities.PublisherService], activatesOn: BloggerEvents.Start },
  () => {
    // Explicit type keeps the emitted declaration portable (TS2883).
    const service: Publisher.PublisherService = TypefullyApi.makeTypefullyPublisherService();
    return Effect.succeed(Capability.contribute(BloggerCapabilities.PublisherService, service));
  },
);
