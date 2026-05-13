//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import { type FilesState } from './schema';

export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(`${meta.id}.capability.settings`);

export const State = Capability.make<Atom.Writable<FilesState>>(`${meta.id}.capability.state`);
