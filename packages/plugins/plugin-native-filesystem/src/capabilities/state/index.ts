//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { NativeFilesystemCapabilities } from '#types';

export * as FilesystemManager from './FilesystemManager';
export const State = Capability.lazyModule(
  'State',
  {
    requires: [Capabilities.AtomRegistry, ClientCapabilities.Client],
    provides: [NativeFilesystemCapabilities.State, NativeFilesystemCapabilities.FilesystemManager],
  },
  () => import('./state'),
);
