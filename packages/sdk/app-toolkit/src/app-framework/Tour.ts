//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Obj, Type } from '@dxos/echo';
import type { TourStepPlacement } from '@dxos/react-ui';
import { Position } from '@dxos/util';

// eslint-disable-next-line @dxos/rules/import-as-namespace
import type * as Translations from '../app/Translations.ts';

/**
 * One stop of a guided tour.
 *
 * `target` must be a control, not a container: the card is placed beside it and a viewport-sized
 * target pushes the card off-screen.
 */
export type Step = {
  /** Defaults to the step's one-based position. */
  id?: string;
  /** A selector, or a function resolving the element; the tour waits for it to appear. */
  target: string | (() => HTMLElement | null);
  title: string;
  description: string;
  placement?: TourStepPlacement;
  /** Runs before the step shows and may bring the target into being (open a sidebar); awaited. */
  before?: (capabilities: CapabilityManager.CapabilityManager) => void | Promise<void>;
};

/**
 * Whether a tour applies to the data of the graph node in the main content area; `undefined` is the
 * app itself. A matcher must reject `undefined` unless its tour is the app's introduction, and must
 * not throw: matchers run unguarded.
 */
export type Matcher = (data?: unknown) => boolean;

/** A guided tour a plugin offers. */
export type Definition = Readonly<{
  /** Stable across releases: it is what gets recorded when the tour has been seen. */
  id: string;
  label: Translations.Label;
  matches: Matcher;
  /** Run unprompted the first time it matches. */
  auto?: boolean;
  /** Where the tour's own steps sit among contributed {@link Fragment}s; neutral when unset. */
  position?: Position.Position;
  steps: readonly Step[];
}>;

/** Steps another plugin adds to whatever tour is running, when its own matcher accepts the subject. */
export type Fragment = Readonly<{
  matches: Matcher;
  /** Relative to the tour's own steps, which sit at neutral: `Position.first` leads, `last` trails. */
  position?: Position.Position;
  steps: readonly Step[];
}>;

/** Matches the app itself rather than anything on screen. */
export const whenGlobal: Matcher = (data) => data === undefined;

/** Matches articles of one ECHO type. */
export const whenType =
  (type: Type.AnyEntity): Matcher =>
  (data) =>
    Obj.isObject(data) && Obj.getTypename(data) === Type.getTypename(type);

/** Matches articles of any of `types`. */
export const whenTypes = (types: readonly Type.AnyEntity[]): Matcher => {
  const typenames = new Set(types.map((type) => Type.getTypename(type)));
  return (data) => Obj.isObject(data) && typenames.has(Obj.getTypename(data) ?? '');
};

/**
 * The steps a tour runs for `data`: its own, plus every fragment accepting the same subject.
 *
 * Synchronous, because a registration already sits behind its plugin's lazy module and costs nothing
 * until that module loads. Resolving steps in a later tick than the one that starts a tour is what
 * lets the machine open on the wrong set.
 */
export const composeSteps = (definition: Definition, fragments: readonly Fragment[], data?: unknown): readonly Step[] =>
  [{ position: definition.position, steps: definition.steps }, ...fragments.filter((f) => f.matches(data))]
    .toSorted(Position.compare)
    .flatMap(({ steps }) => steps);

/** The tours that apply to `data`, in registration order. */
export const matching = (tours: readonly Definition[], data?: unknown): readonly Definition[] =>
  tours.filter((tour) => tour.matches(data));
