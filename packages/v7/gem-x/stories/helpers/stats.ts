//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

import { Projector, Renderer } from '../../src';

export type Stats = {
  nodes?: number
  links?: number
}

export class StatsRenderer extends Renderer<Stats> {
  update (layout: Stats) {
    const root = d3.select(this._surface.root);

    const { clientWidth: width, clientHeight: height } = d3.select(this._surface.svg).node();
    root.selectAll('text.stats').data([{ id: 'stats' }]).join('text').classed('stats', true)
      .attr('x', 8 - width / 2)
      .attr('y', height / 2 - 16)
      .text(JSON.stringify(layout));
  }
}

export class StatsProjector<MODEL> extends Projector<MODEL, Stats> {
  _layout: Stats = {
    nodes: 0
  }

  protected getLayout () {
    return this._layout;
  }

  onUpdate (layout: Stats) {
    this._layout = layout;
    this.updateEvent.emit({ layout: this._layout });
  }
}
