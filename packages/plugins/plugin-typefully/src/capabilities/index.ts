//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { BloggerCapabilities } from '@dxos/plugin-blogger/types';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';

export const Connector = Capability.lazyModule(
  'TypefullyConnector',
  { provides: [ConnectorCapability] },
  () => import('./connector'),
);
export const PublisherService = Capability.lazyModule(
  'TypefullyPublisherService',
  { provides: [BloggerCapabilities.PublisherService] },
  () => import('./publisher-service'),
);
