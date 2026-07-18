//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { BloggerCapabilities, type Publisher } from '@dxos/plugin-blogger/types';
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
