//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as FileCapabilities from '@dxos/plugin-file/FileCapabilities';
import * as FileEvents from '@dxos/plugin-file/FileEvents';

export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);

export const BlobBackend = Capability.lazyModule(
  'BlobBackend',
  {
    requires: [ClientCapabilities.Client],
    provides: [FileCapabilities.Backend],
    // The file plugin's start, not this plugin's own: it contributes no surface, so nothing would
    // ever fire an own-start event for it.
    activatesOn: FileEvents.Start,
  },
  () => import('./blob-backend'),
);
