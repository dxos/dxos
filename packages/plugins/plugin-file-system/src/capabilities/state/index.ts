//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { FileSystemCapabilities, FileSystemEvents } from '#types';

export * as FileSystemManager from './FileSystemManager.ts';
export const State = Capability.lazyModule(
  'State',
  {
    requires: [Capabilities.AtomRegistry, ClientCapabilities.Client],
    provides: [FileSystemCapabilities.State, FileSystemCapabilities.FileSystemManager],
    activatesOn: FileSystemEvents.Start,
  },
  () => import('./state.ts'),
);
