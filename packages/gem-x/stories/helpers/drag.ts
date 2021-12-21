//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';

/**
 * @param simulation
 */
export const createSimulationDrag = (simulation) => {
  let dragging = false;

  return d3.drag()
    .on('start', function () {
      dragging = false;
    })

    .on('drag', function (event) {
      dragging = true;

      event.subject.fx = event.x;
      event.subject.fy = event.y;

      simulation.alphaTarget(0).alpha(0.1).restart();
    })

    .on('end', function () {
      if (!dragging) {
        console.log('select');
      }

      dragging = false;
    });
};
