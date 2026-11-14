//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as EffectAtom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { type ModuleLayout } from './internal/module-container.tsx';

/**
 * Writable atom holding a layout produced at runtime, e.g. by a harness `onInit` that binds the objects it seeded.
 * `ModuleContainer.Root` reads it when contributed and otherwise falls back to its `layout` prop.
 */
export const Atom = Capability.make<EffectAtom.Writable<ModuleLayout | undefined>>()('org.dxos.storybook.layout');
