//
// Copyright 2026 DXOS.org
//

/**
 * What one key shows. Produced by the model, consumed by the renderer — it never crosses the wire
 * (only the rendered SVG does), so it stays a plain type.
 */
export type KeySpec = {
  /** Object DXN; the press target. */
  target: string;
  label: string;
  /** Icon name in the sprite convention, e.g. `ph--house--regular`. */
  icon: string;
  /** Chromatic palette name from `@dxos/ui-types`. */
  hue?: string;
};

/** What one touch-strip segment shows: a running task, or a space statistic when nothing is running. */
export type DialSpec =
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

/** Counts shown on the dials while no task is running. */
export type SpaceStats = {
  readonly objects: number;
  readonly feeds: number;
  readonly types: number;
  readonly plugins: number;
};
