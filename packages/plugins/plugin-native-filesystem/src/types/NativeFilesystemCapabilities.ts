//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import type { FilesystemManager as FilesystemManagerNs } from '#capabilities';
import { meta } from '#meta';

import type { NativeFilesystemState } from './types';

export const State = Capability.make<Atom.Writable<NativeFilesystemState>>(`${meta.id}.state`);
export const FilesystemManager = Capability.make<FilesystemManagerNs.FilesystemManager>(
  `${meta.id}.filesystem-manager`,
);
