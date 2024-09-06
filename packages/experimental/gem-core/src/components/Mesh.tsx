//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
import { type Selection } from 'd3';
import React, { type PropsWithChildren, useEffect } from 'react';
import * as topojson from 'topojson-client';

import { SVG } from './SVG';
import { SVGContextProvider } from './SVGContextProvider';
import { createSvgContext, useSvgContext } from '../hooks';
import { type Size } from '../util';

const MeshRoot = ({ children }: PropsWithChildren) => {
  const context = createSvgContext();
  return <SVGContextProvider context={context}>{children}</SVGContextProvider>;
};

const Hex = () => {
  const { svg, size } = useSvgContext();
  useEffect(() => {
    if (size) {
      const radius = 20;
      const topology = hexTopology(size, radius);
      const projection = hexProjection(radius);
      const path = d3.geoPath().projection(projection);

      d3.select(svg)
        .append('g')
        .attr('class', 'hexagon')
        .selectAll('path')
        .data(topology.objects.hexagons.geometries)
        .enter()
        .append('path')
        .attr('d', (d) => path(topojson.feature(topology, d)))
        .attr('class', (d) => (d.fill ? 'fill' : null));
      // .on('mousedown', mousedown)
      // .on('mousemove', mousemove)
      // .on('mouseup', mouseup);

      d3.select(svg)
        .append('path')
        .datum(topojson.mesh(topology, topology.objects.hexagons))
        .attr('class', 'mesh')
        .attr('d', path);

      const redraw = (border: Selection) => {
        border.attr('d', path(topojson.mesh(topology, topology.objects.hexagons, (a, b) => a.fill ^ b.fill)));
      };

      const border = d3.select(svg).append('path').attr('class', 'border').call(redraw);
    }
  }, [size]);

  return null;
};

export const Mesh = {
  Root: MeshRoot,
  SVG,
  Hex,
};

const hexTopology = ({ width, height }: Size, radius: number) => {
  const dx = radius * 2 * Math.sin(Math.PI / 3);
  const dy = radius * 1.5;
  const m = Math.ceil((height + radius) / dy) + 1;
  const n = Math.ceil(width / dx) + 1;
  const geometries = [];
  const arcs = [];

  for (let j = -1; j <= m; ++j) {
    for (let i = -1; i <= n; ++i) {
      const y = j * 2;
      const x = (i + (j & 1) / 2) * 2;
      arcs.push(
        [
          [x, y - 1],
          [1, 1],
        ],
        [
          [x + 1, y],
          [0, 1],
        ],
        [
          [x + 1, y + 1],
          [-1, 1],
        ],
      );
    }
  }

  for (let j = 0, q = 3; j < m; ++j, q += 6) {
    for (let i = 0; i < n; ++i, q += 3) {
      geometries.push({
        type: 'Polygon',
        arcs: [[q, q + 1, q + 2, ~(q + (n + 2 - (j & 1)) * 3), ~(q - 2), ~(q - (n + 2 + (j & 1)) * 3 + 2)]],
        fill: Math.random() > (i / n) * 2,
      });
    }
  }

  return {
    transform: { translate: [0, 0], scale: [1, 1] },
    objects: { hexagons: { type: 'GeometryCollection', geometries } },
    arcs,
  };
};

const hexProjection = (radius: number) => {
  const dx = radius * 2 * Math.sin(Math.PI / 3);
  const dy = radius * 1.5;
  return {
    stream: (stream) => ({
      point: (x: number, y: number) => {
        stream.point((x * dx) / 2, ((y - (2 - (y & 1)) / 3) * dy) / 2);
      },
      lineStart: () => {
        stream.lineStart();
      },
      lineEnd: () => {
        stream.lineEnd();
      },
      polygonStart: () => {
        stream.polygonStart();
      },
      polygonEnd: () => {
        stream.polygonEnd();
      },
    }),
  };
};
