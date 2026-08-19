//
// Copyright 2026 DXOS.org
//

import { type Progress } from '@dxos/progress';

/**
 * What one shortcut slot shows. Produced by the model, consumed by whichever device renders it — it
 * never crosses a wire, so it stays a plain type.
 */
export type Shortcut = {
  /**
   * Graph navigation path of the object — what `LayoutOperation.Open` consumes, so a press needs no
   * lookup. Carried through the frame, which makes the device stateless about what a slot means.
   */
  target: string;
  label: string;
  /** Icon name in the sprite convention, e.g. `ph--house--regular`. */
  icon: string;
  /** Chromatic palette name from `@dxos/ui-types`. */
  hue?: string;
};

/** What one metric slot shows: a running task, or a space statistic when nothing is running. */
export type MetricSpec =
  | {
      readonly kind: 'progress';
      readonly title: string;
      /** Fraction in `[0, 1]`, or undefined when the task reports no total. */
      readonly ratio?: number;
      readonly detail?: string;
    }
  | {
      readonly kind: 'stat';
      readonly title: string;
      readonly value: string;
    };

/** Counts shown while no task is running. */
export type SpaceStats = {
  readonly objects: number;
  readonly feeds: number;
  readonly types: number;
  readonly plugins: number;
};

/**
 * Device-agnostic projection of the active space, for peripheral displays.
 *
 * Facts only: slot counts, truncation and icon resolution are hardware concerns and belong to the
 * device plugin consuming this, so one set of queries serves every attached device.
 */
export type SpaceDashboard = {
  readonly stats: SpaceStats;
  readonly tasks: readonly Progress.TaskProgress[];
  readonly favorites: readonly Shortcut[];
};
