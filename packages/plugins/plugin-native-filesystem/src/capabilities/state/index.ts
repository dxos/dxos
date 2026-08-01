//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ClientCapabilities } from '@dxos/plugin-client';

import { NativeFilesystemCapabilities, NativeFilesystemEvents } from '#types';

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
