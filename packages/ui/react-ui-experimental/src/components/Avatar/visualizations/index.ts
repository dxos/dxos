//
// Copyright 2026 DXOS.org
//

import { type AnyVisualization } from '../visualization.ts';
import { chaos } from './chaos.ts';
import { inkLine, inkMorph } from './ink-line.ts';
import { ink } from './ink.ts';
import { kube } from './kube.ts';
import { orb } from './orb.ts';
import { ripple } from './ripple.ts';
import { spectrum } from './spectrum.ts';

export * from './chaos.ts';
export * from './common.ts';
export * from './ink.ts';
export * from './ink-line.ts';
export * from './kube.ts';
export * from './orb.ts';
export * from './ripple.ts';
export * from './spectrum.ts';

/** Every visualization, in the order a picker lists them. */
export const VISUALIZATIONS: readonly AnyVisualization[] = [orb, ripple, chaos, kube, spectrum, ink, inkLine, inkMorph];

export const getVisualization = (id: string): AnyVisualization | undefined =>
  VISUALIZATIONS.find((visualization) => visualization.id === id);
