//
// Copyright 2025 DXOS.org
//

import { easeCubicOut, select } from 'd3';

import { type D3Callable, type D3Selection } from '../util';

const PROP_PULSAR_ACTIVE = 'dx-pulsar-active';

/**
 * Pulsar effect.
 */
export namespace Pulsar {
  export const has = (group: D3Selection<SVGGElement>) => group.select('circle.dx-pulsar').empty();

  export const create: D3Callable<SVGGElement> = (group, r: number, options: PulsarOptions = {}) => {
    const pulsar = group
      .append('circle')
      .classed('dx-pulsar', true)
      .classed('stroke-2 stroke-red-500 fill-none', true)
      .property(PROP_PULSAR_ACTIVE, true);

    startAnimation(pulsar, r, options);
  };

  export const remove: D3Callable<SVGGElement> = (group) => {
    group.select('circle.dx-pulsar').property(PROP_PULSAR_ACTIVE, false);
  };

  export type Options = PulsarOptions;
}

type PulsarOptions = {
  period?: number;
  duration?: number;
  ratio?: number;
};

const startAnimation = (pulsar: D3Selection<SVGCircleElement>, r: number, options: PulsarOptions = {}) => {
  const { period = 1_000, duration = 800, ratio = 3 } = options;
  return pulsar
    .attr('r', r)
    .attr('opacity', 1)
    .transition('pulsar')
    .delay(period - (Date.now() % period))
    .duration(Math.min(duration, period - 20))
    .ease(easeCubicOut)
    .attr('r', r * ratio)
    .attr('opacity', -0.1)
    .on('end', function () {
      if (select(this).property(PROP_PULSAR_ACTIVE)) {
        startAnimation(select(this), r, options);
      } else {
        select(this).remove();
      }
    });
};
