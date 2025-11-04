//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, type SVGProps } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Dimension, type Point } from '../types';

// Refs
//  - https://airbnb.io/visx/gallery
//  - https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/primitives/Vec.ts

export const createPath = (points: Point[], join = false) =>
  ['M', points.map(({ x, y }) => `${x},${y}`).join(' L '), join ? 'Z' : ''].join(' ');

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
 * NOTE: Leave space around shape for line width.
 */
export const Markers = ({ id = 'dx-marker', classNames }: ThemedClassName<{ id?: string }>) => (
  <>
    <Arrow id={`${id}-arrow-start`} dir='start' classNames={classNames} />
    <Arrow id={`${id}-arrow-end`} dir='end' classNames={classNames} />
    <Arrow id={`${id}-triangle-start`} dir='start' closed classNames={classNames} />
    <Arrow id={`${id}-triangle-end`} dir='end' closed classNames={classNames} />
    <Marker id={`${id}-circle`} pos={{ x: 8, y: 8 }} size={{ width: 16, height: 16 }}>
      <circle cx={8} cy={8} r={5} stroke={'context-stroke'} className={mx(classNames)} />
    </Marker>
  </>
);

export type MarkerProps = SVGProps<SVGMarkerElement> &
  PropsWithChildren<
    ThemedClassName<{
      id: string;
      pos: Point;
      size: Dimension;
      fill?: boolean;
    }>
  >;

/**
 * https://www.w3.org/TR/SVG2/painting.html#Markers
 */
export const Marker = ({
  id,
  className,
  children,
  pos: { x: refX, y: refY },
  size: { width: markerWidth, height: markerHeight },
  fill,
  ...rest
}: MarkerProps) => (
  <marker
    id={id}
    className={className}
    {...{
      refX,
      refY,
      markerWidth,
      markerHeight,
      markerUnits: 'strokeWidth',
      orient: 'auto',
      ...rest,
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
      stroke={'context-stroke'}
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

export const GridPattern = ({
  classNames,
  id,
  size,
  offset,
}: ThemedClassName<{ id: string; size: number; offset: Point }>) => (
  <pattern
    id={id}
    x={(size / 2 + offset.x) % size}
    y={(size / 2 + offset.y) % size}
    width={size}
    height={size}
    patternUnits='userSpaceOnUse'
  >
    {/* TODO(burdon): vars. */}
    <g className={mx(classNames)}>
      <line x1={0} y1={size / 2} x2={size} y2={size / 2} />
      <line x1={size / 2} y1={0} x2={size / 2} y2={size} />
    </g>
  </pattern>
);
