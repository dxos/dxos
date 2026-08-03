//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as BloggerCapabilities from '@dxos/plugin-blogger/BloggerCapabilities';
import * as BloggerEvents from '@dxos/plugin-blogger/BloggerEvents';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';

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
