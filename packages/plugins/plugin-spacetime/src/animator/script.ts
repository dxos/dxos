//
// Copyright 2026 DXOS.org
//

import type * as Animation from '@dxos/plugin-animator/Animation';

import { LABEL_FROM, LABEL_MORPH } from './stage.ts';

/** The length of the beat that switches a label's text before the morph eases across. */
const SWITCH = 0.01;

export type LabelMorphOptions = {
  target: string;
  from: string;
  to: string;
  /** Seconds into the shot the morph starts. */
  at: number;
  /** Seconds the words take to slide. */
  duration: number;
  ease?: Animation.Beat['ease'];
};

/**
 * Beats that morph a label from one text to another (F-8.2): the text switches at once, recording what it was, and
 * the morph then eases from 0 to 1, so the stage slides the words that differ (D-30).
 */
export const labelMorphBeats = ({ target, from, to, at, duration, ease }: LabelMorphOptions): Animation.Beat[] => [
  { at, duration: SWITCH, set: { [target]: { label: to, [LABEL_FROM]: from, [LABEL_MORPH]: 0 } } },
  {
    at: at + SWITCH,
    duration: Math.max(SWITCH, duration - SWITCH),
    ease: ease ?? 'ease-in-out',
    set: { [target]: { [LABEL_MORPH]: 1 } },
  },
];
