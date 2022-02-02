//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

import { Projector, Renderer } from '../../src';

// TODO(burdon): Pass layout.
export type Stats = {
  nodes?: number
  links?: number
}

export type StatsRendererOptions = {}

export class StatsRenderer extends Renderer<Stats, StatsRendererOptions> {
  update (layout: Stats) {
    const root = d3.select(this._surface.root);

    const { clientWidth: width, clientHeight: height } = d3.select(this._surface.svg).node();
    root.selectAll('text.stats').data([{ id: 'stats' }]).join('text').attr('class', 'stats')
      .attr('x', 8 - width / 2)
      .attr('y', height / 2 - 16)
      .text(JSON.stringify(layout));
  }
}

export class StatsProjector<MODEL> extends Projector<MODEL, Stats, any> {
  _layout: Stats = {
    nodes: 0
  }

  protected getLayout () {
    return this._layout;
  }

  onUpdate (layout: Stats) {
    this._layout = layout;
    this.updated.emit({ layout: this._layout });
  }
}
