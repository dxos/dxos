//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Mesh } from './Mesh';

const Story = () => {
  return (
    <Mesh.Root>
      <Mesh.SVG className={mx('[&>.hexagon]:fill-white [&>.mesh]:fill-none')} />
      <Mesh.Hex />
    </Mesh.Root>
  );
};

export default {
  title: 'gem-core/Mesh',
  component: Mesh,
  render: () => <Story />,
  decorators: [withTheme, withFullscreen({ classNames: 'bg-[#111]' })],
};

export const Default = {};

/*

var border = svg.append("path")
    .attr("class", "border")
    .call(redraw);

var mousing = 0;

function mousedown(d) {
  mousing = d.fill ? -1 : +1;
  mousemove.apply(this, arguments);
}

function mousemove(d) {
  if (mousing) {
    d3.select(this).classed("fill", d.fill = mousing > 0);
    border.call(redraw);
  }
}

function mouseup() {
  mousemove.apply(this, arguments);
  mousing = 0;
}

function redraw(border) {
  border.attr("d", path(topojson.mesh(topology, topology.objects.hexagons, function(a, b) { return a.fill ^ b.fill; })));
}

 */
