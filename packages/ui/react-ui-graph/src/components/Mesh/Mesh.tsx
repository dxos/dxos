//
// Copyright 2024 DXOS.org
//

import { type GeoStream, geoPath, select } from 'd3';
import { useEffect } from 'react';
import { feature, mesh } from 'topojson-client';
import { type GeometryCollection, type GeometryObject, type Objects, type Topology } from 'topojson-specification';

import { useSvgContext } from '../../hooks';
import { type Size } from '../../util';

export type MeshProps = {
  radius?: number;
  value?: number;
};

// https://d3og.com/mbostock/5249328
export const Mesh = ({ radius = 16, value = 0.5 }: MeshProps) => {
  const { svg, size } = useSvgContext();

  useEffect(() => {
    if (size) {
      // TODO(burdon): Resize doesn't trigger.
      const topology = hexTopology(size, radius, value);
      const projection = hexProjection(radius);
      const path = geoPath().projection(projection);

      select(svg)
        .append('g')
        .attr('class', 'hexagon')
        .selectAll('path')
        .data(topology.objects.hexagons.geometries)
        .enter()
        .append('path')
        .attr('d', (d) => path(feature(topology, d)))
        .attr('class', (d) => ((d.properties as Custom)?.fill ? 'fill' : null));
      // .on('mousedown', mousedown)
      // .on('mousemove', mousemove)
      // .on('mouseup', mouseup);

      select(svg).append('path').datum(mesh(topology, topology.objects.hexagons)).attr('class', 'mesh').attr('d', path);

      const redraw = (border: any) => {
        border.attr(
          'd',
          path(
            mesh(
              topology,
              topology.objects.hexagons,
              (a, b) => (a.properties as Custom).fill !== (b.properties as Custom).fill,
            ),
          ),
        );
      };

      select(svg).append('path').attr('class', 'border').call(redraw);
    }
  }, [svg, size, value]);

  return null;
};

type Custom = { fill: boolean };

interface HexObjects extends Objects<{ fill: boolean }> {
  hexagons: GeometryCollection<Custom>;
}

const hexTopology = ({ width, height }: Size, radius: number, value = 1): Topology<HexObjects> => {
  const dx = radius * 2 * Math.sin(Math.PI / 3);
  const dy = radius * 1.5;
  const m = Math.ceil((height + radius) / dy) + 1;
  const n = Math.ceil(width / dx) + 1;
  const geometries: Array<GeometryObject<{ fill: boolean }>> = [];
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
        properties: {
          fill: Math.random() > (i / n) * (1 / value),
        },
      });
    }
  }

  const hexagons: GeometryCollection<{ fill: boolean }> = { type: 'GeometryCollection', geometries };

  return {
    type: 'Topology',
    transform: { translate: [0, 0], scale: [1, 1] },
    objects: { hexagons },
    arcs,
  };
};

const hexProjection = (radius: number) => {
  const dx = radius * 2 * Math.sin(Math.PI / 3);
  const dy = radius * 1.5;
  return {
    stream: (stream: GeoStream) => ({
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
