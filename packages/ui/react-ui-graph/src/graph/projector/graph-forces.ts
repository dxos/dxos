//
// Copyright 2025 DXOS.org
//

import { type Force, type SimulationLinkDatum, type SimulationNodeDatum, forceX, forceY } from 'd3';

export type ForcePointOptions = {
  x?: number;
  y?: number;
  strength?: number;
};

export const forcePoint = <
  NodeDatum extends SimulationNodeDatum,
  LinkDatum extends SimulationLinkDatum<NodeDatum> | undefined,
>({
  x,
  y,
  strength = 0.01,
}: ForcePointOptions): Force<NodeDatum, LinkDatum> => {
  const fx = x != null ? forceX(x).strength(strength) : undefined;
  const fy = y != null ? forceY(y).strength(strength) : undefined;

  const force = (alpha: number) => {
    fx?.(alpha);
    fy?.(alpha);
  };

  force.initialize = (nodes: any[], random: () => number) => {
    fx?.initialize(nodes, random);
    fy?.initialize(nodes, random);
  };

  return force;
};
