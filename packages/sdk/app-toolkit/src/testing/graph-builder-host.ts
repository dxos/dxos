//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as AppCapabilities from '../app-framework/AppCapabilities.ts';

export type GraphBuilderHostOptions = {
  /** Contributes `AppCapabilities.ReadOnly`, as a read-only host does. */
  readOnly?: boolean;
};

/**
 * A capability manager and a graph builder on one registry, as the app runs them: a capability atom read
 * through another registry never sees the manager's contributions.
 */
export const makeGraphBuilderHost = ({ readOnly = false }: GraphBuilderHostOptions = {}) => {
  const registry = Registry.make();
  const manager = CapabilityManager.make({ registry });
  if (readOnly) {
    manager.contribute({ module: 'test', interface: AppCapabilities.ReadOnly, implementation: true });
  }
  return {
    registry,
    manager,
    /** Runs an extension factory against the manager. */
    build: <A>(effect: Effect.Effect<A, never, Capability.Service>): Promise<A> =>
      EffectEx.runPromise(effect.pipe(Effect.provideService(Capability.Service, manager))),
    setup: (extensions: AppGraphBuilder.BuilderExtension[]) => setupGraphBuilder({ registry, extensions }),
  };
};
