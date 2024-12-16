//
// Copyright 2024 DXOS.org
//

import React, { type SVGProps, type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Dimension, type Point } from '../layout';

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
 * NOTE: Leave space around shape for line width.
 */
export const Markers = () => {
  return (
    <>
      <Arrow id='dx-arrow-start' dir='start' />
      <Arrow id='dx-arrow-end' dir='end' />
      <Arrow id='dx-triangle-start' dir='start' closed />
      <Arrow id='dx-triangle-end' dir='end' closed />
      <Marker id='dx-circle' pos={{ x: 6, y: 6 }} size={{ width: 12, height: 12 }}>
        <circle cx={6} cy={6} r={5} />
      </Marker>
    </>
  );
};

// Refs
//  - https://airbnb.io/visx/gallery
//  - https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/primitives/Vec.ts

export const createPath = (points: Point[], join = false) => {
  return ['M', points.map(({ x, y }) => `${x},${y}`).join(' L '), join ? 'Z' : ''].join(' ');
};

export const Marker = ({
  id,
  children,
  pos: { x: refX, y: refY },
  size: { width: markerWidth, height: markerHeight },
  fill,
  ...rest
}: PropsWithChildren<
  {
    id: string;
    pos: Point;
    size: Dimension;
    fill?: boolean;
  } & SVGProps<SVGMarkerElement>
>) => (
  <marker
    id={id}
    fill={fill ? 'fill' : 'none'}
    {...{
      orient: 'auto',
      markerUnits: 'strokeWidth',
      refX,
      refY,
      markerWidth,
      markerHeight,
      ...rest,
    }}
    style={{
      fill: 'var(--dx-marker-fill, #888)',
      stroke: 'var(--dx-marker-stroke, #888)',
    }}
  >
    {children}
  </marker>
);

export const Arrow = ({
  classNames,
  id,
  size = 16,
  dir = 'end',
  closed = false,
}: ThemedClassName<{ id: string; size?: number; dir?: 'start' | 'end'; closed?: boolean }>) => (
  <Marker
    id={id}
    size={{ width: size, height: size }}
    pos={dir === 'end' ? { x: size, y: size / 2 } : { x: 0, y: size / 2 }}
  >
    <path
      fill={closed ? undefined : 'none'}
      className={mx(classNames)}
      d={createPath(
        dir === 'end'
          ? [
              { x: 1, y: 1 },
              { x: size, y: size / 2 },
              { x: 1, y: size - 1 },
            ]
          : [
              { x: size - 1, y: 1 },
              { x: 0, y: size / 2 },
              { x: size - 1, y: size - 1 },
            ],
        closed,
      )}
    />
  </Marker>
);
