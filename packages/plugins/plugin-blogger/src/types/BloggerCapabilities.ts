//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

// Provider/consumer contract: a publishing backend contributes an implementation;
// plugin-blogger's sync operations consume all contributions.
export const PublisherService = Capability.make<import('./Publisher').PublisherService>(
  `${meta.profile.key}.capability.publisher-service`,
);
