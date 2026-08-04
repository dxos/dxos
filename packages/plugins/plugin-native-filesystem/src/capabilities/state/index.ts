//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import * as NativeFilesystemCapabilities from '../../types/NativeFilesystemCapabilities';
import * as NativeFilesystemEvents from '../../types/NativeFilesystemEvents';

export * as FilesystemManager from './FilesystemManager';
export const State = Capability.lazyModule(
  'State',
  {
    requires: [Capabilities.AtomRegistry, ClientCapabilities.Client],
    provides: [NativeFilesystemCapabilities.State, NativeFilesystemCapabilities.FilesystemManager],
    activatesOn: NativeFilesystemEvents.Start,
  },
  () => import('./state'),
);
