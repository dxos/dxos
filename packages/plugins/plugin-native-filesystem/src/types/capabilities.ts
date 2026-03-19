//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import type { NativeFilesystemState } from './schema';

export namespace NativeFilesystemCapabilities {
  export const State = Capability.make<Atom.Writable<NativeFilesystemState>>(`${meta.id}.state`);
}
