//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Connector = Capability.lazy('TypefullyConnector', () => import('./connector'));
export const PublisherService = Capability.lazy('TypefullyPublisherService', () => import('./publisher-service'));
