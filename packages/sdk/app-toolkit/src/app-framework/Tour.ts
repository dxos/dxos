//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Obj, Type } from '@dxos/echo';
import type * as Tour from '@dxos/react-ui/Tour';
import { TOOLBAR_HOLDS_ATTRIBUTE, TOOLBAR_OVERFLOW_TESTID } from '@dxos/ui-types';
import * as Position from '@dxos/util/Position';

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
  placement?: Tour.StepPlacement;
  /** Runs before the step shows and may bring the target into being (open a sidebar); awaited. */
  before?: (capabilities: CapabilityManager.CapabilityManager) => void | Promise<void>;
};

/**
 * A step pointing at a toolbar control, which a narrow toolbar may have folded into a group's
 * dropdown or its overflow (⋮) menu. The control keeps its test id there, so the step only has to
 * open the dropdown that holds it, or else the overflow menu, to reach it.
 *
 * A control that collapses as part of a group is one level further in, since a group becomes a
 * submenu whose items resolve only once it opens; the step is then skipped rather than reached.
 */
export const toolbarStep = (testId: string, step: Omit<Step, 'target' | 'before'>): Step => {
  const target = `[data-testid="${testId}"]`;
  return {
    ...step,
    target,
    before: async () => {
      const overflow = document.querySelector<HTMLElement>(`[data-testid="${TOOLBAR_OVERFLOW_TESTID}"]`);
      // The menu an earlier step opened: the overflow menu or a folded group's dropdown.
      const open = [overflow, ...document.querySelectorAll<HTMLElement>(`[${TOOLBAR_HOLDS_ATTRIBUTE}]`)].find(
        (trigger) => trigger?.getAttribute('aria-expanded') === 'true',
      );
      const element = document.querySelector(target);
      if (element) {
        // A control in a menu is already shown; one in the row is covered by any open menu.
        if (!element.closest('[role="menu"]')) {
          open?.click();
        }
        return;
      }

      open?.click();
      // A group folded in place holds the control in its own dropdown; failing that, the overflow menu does.
      const holder = document.querySelector<HTMLElement>(`[${TOOLBAR_HOLDS_ATTRIBUTE}~="${testId}"]`);
      (holder ?? overflow)?.click();
      // A menu renders its items after it opens, and the card is placed only on a target that exists.
      await appears(target);
    },
  };
};

/** Resolves once `selector` matches, or after `timeout` ms. */
const appears = async (selector: string, timeout = 1_000) => {
  const deadline = Date.now() + timeout;
  while (!document.querySelector(selector) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
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
 */
export const composeSteps = (definition: Definition, fragments: readonly Fragment[], data?: unknown): readonly Step[] =>
  [{ position: definition.position, steps: definition.steps }, ...fragments.filter((f) => f.matches(data))]
    .toSorted(Position.compare)
    .flatMap(({ steps }) => steps);

/** The tours that apply to `data`, in registration order. */
export const matching = (tours: readonly Definition[], data?: unknown): readonly Definition[] =>
  tours.filter((tour) => tour.matches(data));
