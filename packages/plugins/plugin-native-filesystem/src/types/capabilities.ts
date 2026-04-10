//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import type { FilesystemManager } from '#capabilities';
import { meta } from '#meta';

import type { NativeFilesystemState } from './types';

export namespace NativeFilesystemCapabilities {
  export const State = Capability.make<Atom.Writable<NativeFilesystemState>>(`${meta.id}.state`);
  export const FilesystemManager = Capability.make<FilesystemManager.FilesystemManager>(
    `${meta.id}.filesystem-manager`,
  );
}
