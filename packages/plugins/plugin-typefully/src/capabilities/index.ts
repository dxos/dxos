//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import { BloggerCapabilities } from '@dxos/plugin-blogger/types';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';

export const Connector = Capability.lazyModule(
  'TypefullyConnector',
  { provides: [ConnectorCapability], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./connector'),
);
export const PublisherService = Capability.lazyModule(
  'TypefullyPublisherService',
  { provides: [BloggerCapabilities.PublisherService], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./publisher-service'),
);
