//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
// eslint-disable-next-line @dxos/rules/import-as-namespace
import type * as Translations from '@dxos/app-toolkit/Translations';
import { Obj, Type } from '@dxos/echo';
import type { TourStepPlacement } from '@dxos/react-ui';
import { Position } from '@dxos/util';

/**
 * One stop of a guided tour: a target on the page, what to say beside it, and a hook run before it shows.
 *
 * Target a CONTROL, not a container. The card is positioned beside the target and the spotlight cuts
 * it out of the backdrop, so a target that fills the viewport pushes the card off-screen and teaches
 * nothing anyway. `before` runs and is awaited before the target is resolved, so a step can put the
 * page into the state it is about, opening a tab or a pane it needs.
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
 * Whether a tour applies to what the app is showing. The argument is the DATA of the graph node in
 * the main content area, typed `unknown` because not every node carries an ECHO object — a settings
 * page, Home, and the plugin registry are nodes too, and each can have a tour. `undefined` means the
 * app itself rather than anything it is displaying, which is what makes a tour global.
 *
 * A matcher MUST reject `undefined`, or its tour runs as the app's introduction; {@link whenType}
 * and its kin do. Matchers run unguarded: one that throws is a bug in the plugin that registered it.
 */
export type Matcher = (data?: unknown) => boolean;

/**
 * A guided tour a plugin offers. Registration is metadata plus a step loader, so a consumer can ask
 * what applies to the node in front of it without paying for anyone's steps.
 */
export type Definition = Readonly<{
  /** Stable across releases: it is what gets recorded when the tour has been seen. */
  id: string;
  label: Translations.Label;
  matches: Matcher;
  /** Run unprompted the first time it matches. */
  auto?: boolean;
  /** Where the tour's own steps sit among contributed {@link Fragment}s; neutral when unset. */
  position?: Position.Position;
  /** A loader rather than an array so step bodies stay out of the registering module's closure. */
  steps: () => Promise<readonly Step[]>;
}>;

/**
 * Steps another plugin adds to whatever tour is running, when its own matcher accepts the subject.
 *
 * Fragments join by matcher rather than by naming a tour, which is what keeps the coupling one-way:
 * a plugin that owns a feature says where its feature applies, and never learns which tours exist or
 * what they are called. A tour needs no fragments. Its own steps are the whole of it until someone
 * contributes.
 */
export type Fragment = Readonly<{
  matches: Matcher;
  /** Relative to the tour's own steps, which sit at neutral: `Position.first` leads, `last` trails. */
  position?: Position.Position;
  steps: () => Promise<readonly Step[]>;
}>;

/** Matches the app itself: the walkthrough offered from the help menu, not tied to anything on screen. */
export const whenGlobal: Matcher = (data) => data === undefined;

/** Matches articles of one ECHO type. */
export const whenType =
  (type: Type.AnyEntity): Matcher =>
  (data) =>
    Obj.isObject(data) && Obj.getTypename(data) === Type.getTypename(type);

/** Matches articles of any of `types`, for a fragment that applies wherever its feature does. */
export const whenTypes = (types: readonly Type.AnyEntity[]): Matcher => {
  const typenames = new Set(types.map((type) => Type.getTypename(type)));
  return (data) => Obj.isObject(data) && typenames.has(Obj.getTypename(data) ?? '');
};

/**
 * The step loaders a tour runs for `data`, in order: its own steps plus every fragment that accepts
 * the same subject. Loaders rather than steps, so a caller decides when to pay for them.
 */
export const stepLoaders = (
  definition: Definition,
  fragments: readonly Fragment[],
  data?: unknown,
): readonly (() => Promise<readonly Step[]>)[] =>
  [
    { position: definition.position, steps: definition.steps },
    ...fragments.filter((fragment) => fragment.matches(data)),
  ]
    // Stable, so fragments sharing a position keep the order their plugins registered in.
    .toSorted(Position.compare)
    .map(({ steps }) => steps);

/** The tours that apply to `data`, in registration order. */
export const matching = (tours: readonly Definition[], data?: unknown): readonly Definition[] =>
  tours.filter((tour) => tour.matches(data));
