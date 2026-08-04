//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as BloggerCapabilities from '@dxos/plugin-blogger/BloggerCapabilities';
import * as BloggerEvents from '@dxos/plugin-blogger/BloggerEvents';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

export const Connector = Capability.lazyModule(
  'TypefullyConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const PublisherService = Capability.lazyModule(
  'TypefullyPublisherService',
  { provides: [BloggerCapabilities.PublisherService], activatesOn: BloggerEvents.Start },
  () => import('./publisher-service'),
);
