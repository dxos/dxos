//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

/** The error each module failed with, by module id. */
export const ModuleErrors = Capability.makeSingleton<Atom.Writable<Readonly<Record<string, Error>>>>()(
  'org.dxos.plugin.inspector.capability.moduleErrors',
);
