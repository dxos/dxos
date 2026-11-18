//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

import * as AppCapabilities from './AppCapabilities.ts';

/**
 * Whether the host contributes {@link AppCapabilities.ReadOnly}, as an atom a graph builder reads with `get`. The
 * contribution has no order against module activation, so it is read when the graph expands, not when a module loads.
 */
export const atom: Effect.Effect<Atom.Atom<boolean>, never, Capability.Service> = Effect.map(
  Capability.atom(AppCapabilities.ReadOnly),
  (contributions) => Atom.make((get) => get(contributions).length > 0),
);

/** Whether the host is read-only now, for an operation or a module that reads it in an Effect. */
export const current: Effect.Effect<boolean, never, Capability.Service> = Effect.map(
  Capability.getOption(AppCapabilities.ReadOnly),
  Option.isSome,
);

/** Whether the host is read-only now; for work that runs later, outside the graph and React. */
export const isActive = (manager: CapabilityManager.CapabilityManager): boolean =>
  manager.getAll(AppCapabilities.ReadOnly).length > 0;

/** Narrows a node matcher to match nothing while the host is read-only. */
export const unless =
  <T>(
    readOnly: Atom.Atom<boolean>,
    match: (node: AppGraphNode.Node, get: Atom.AtomContext) => Option.Option<T>,
  ): ((node: AppGraphNode.Node, get: Atom.AtomContext) => Option.Option<T>) =>
  (node, get) =>
    get(readOnly) ? Option.none() : match(node, get);
