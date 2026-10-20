//
// Copyright 2026 DXOS.org
//

import { type AnyVisualization } from '../visualization.ts';
import { inkLine, inkMorph } from './ink-line.ts';
import { ink } from './ink.ts';
import { orb } from './orb.ts';
import { spectrum } from './spectrum.ts';
import { torusKnot } from './torus-knot.ts';

export * from './common.ts';
export * from './ink.ts';
export * from './ink-line.ts';
export * from './orb.ts';
export * from './spectrum.ts';
export * from './torus-knot.ts';

/** Every visualization, in the order a picker lists them. */
export const VISUALIZATIONS: readonly AnyVisualization[] = [orb, torusKnot, spectrum, ink, inkLine, inkMorph];

export const getVisualization = (id: string): AnyVisualization | undefined =>
  VISUALIZATIONS.find((visualization) => visualization.id === id);
