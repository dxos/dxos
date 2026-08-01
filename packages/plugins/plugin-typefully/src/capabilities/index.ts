//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { BloggerCapabilities, BloggerEvents } from '@dxos/plugin-blogger/types';
import { Connector as ConnectorCapability, ConnectorEvents } from '@dxos/plugin-connector';

export const Connector = Capability.lazyModule(
  'TypefullyConnector',
  { provides: [ConnectorCapability], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const PublisherService = Capability.lazyModule(
  'TypefullyPublisherService',
  { provides: [BloggerCapabilities.PublisherService], activatesOn: BloggerEvents.Start },
  () => import('./publisher-service'),
);
