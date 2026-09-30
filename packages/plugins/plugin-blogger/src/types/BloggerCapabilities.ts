//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

// Provider/consumer contract: a publishing backend contributes an implementation;
// plugin-blogger's sync operations consume all contributions.
export const PublisherService = Capability.makeSingleton<import('./Publisher.ts').PublisherService>()(
  `${meta.profile.key}.capability.publisherService`,
);
