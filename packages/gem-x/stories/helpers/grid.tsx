//
// Copyright 2020 DXOS.org
//

import * as d3 from "d3";

const createGrid = ({ width, height, gridSize = 32 }, transform = undefined) => {
  const { x = 0, y = 0, k = 1 } = transform || {};
  const s = 1 / k;

  // Scale grid size.
  const gs = Math.pow(2, Math.round(Math.log2(s * gridSize)));

  // Extents.
  const mod = (n, m, delta = 0) => (Math.floor(n / m + delta) * m);
  const xRange = d3.range(-mod((x + width / 2) * s, gs), mod((-x + width / 2) * s, gs, 1), gs);
  const yRange = d3.range(-mod((y + height / 2) * s, gs), mod((-y + height / 2) * s, gs, 1), gs);

  // Offset.
  const w = width * s;
  const h = height * s;
  const dx = -(x + width / 2) * s;
  const dy = -(y + height / 2) * s;

  // Create array of paths.
  const lines = [
    ...xRange.map(x => [[x, dy], [x, dy + h]]),
    ...yRange.map(y => [[dx, y], [dx + w, y]])
  ];

  // Create path.
  const createLine = d3.line();
  return lines.map(line => createLine(line as any)).join();
};

export const grid = ({ width, height }, transform = undefined) => (el) => {
  el.selectAll('path').data([{ id: 'grid' }]).join('path').attr('d', createGrid({ width, height }, transform));

  if (transform) {
    el.attr('transform', transform);
    el.attr('stroke-width', 1 / transform.k);
  }
}
