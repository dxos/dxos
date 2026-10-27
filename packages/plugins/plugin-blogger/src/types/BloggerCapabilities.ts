//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';

import { BloggerNamespace } from '../namespace.ts';

// Provider/consumer contract: a publishing backend contributes an implementation;
// plugin-blogger's sync operations consume all contributions.
export const PublisherService = Capability.makeSingleton<import('./Publisher.ts').PublisherService>()(
  `${BloggerNamespace.key}.capability.publisherService`,
);
