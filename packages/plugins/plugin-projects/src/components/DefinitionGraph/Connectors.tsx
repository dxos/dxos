//
// Copyright 2026 DXOS.org
//

import React, { type RefObject, useEffect, useId, useState } from 'react';

import { mx } from '@dxos/ui-theme';

/** An arrow from one node to another, both found in the container by their `data-node` id. */
export type Connector = { id: string; from: string; to: string; dashed?: boolean; accent?: boolean };

type Rect = { left: number; top: number; right: number; bottom: number };

type Route = { id: string; points: [number, number][]; dashed?: boolean; accent?: boolean };

/** Gap (px) the arrow's tip stops short of its target. */
const TIP_GAP = 2;

/**
 * An elbow between two boxes: down or up between their facing edges when one is above the other, otherwise across
 * between their facing sides, bending once halfway.
 */
const routeOf = (from: Rect, to: Rect): [number, number][] => {
  const centre = (rect: Rect): [number, number] => [(rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2];
  const [fx, fy] = centre(from);
  const [tx, ty] = centre(to);
  if (from.bottom <= to.top || to.bottom <= from.top) {
    const down = from.bottom <= to.top;
    const y0 = down ? from.bottom : from.top;
    const y1 = down ? to.top - TIP_GAP : to.bottom + TIP_GAP;
    const mid = (y0 + y1) / 2;
    return [
      [fx, y0],
      [fx, mid],
      [tx, mid],
      [tx, y1],
    ];
  }
  const right = from.right <= to.left;
  const x0 = right ? from.right : from.left;
  const x1 = right ? to.left - TIP_GAP : to.right + TIP_GAP;
  const mid = (x0 + x1) / 2;
  return [
    [x0, fy],
    [mid, fy],
    [mid, ty],
    [x1, ty],
  ];
};

/**
 * Measures every connector's ends inside the container, again whenever the container or its content resizes. A
 * passive effect, since the layer sits inside the container and a child's layout effect runs before its parent's ref
 * is set.
 */
const useRoutes = (container: RefObject<HTMLElement | null>, connectors: readonly Connector[]): Route[] => {
  const [routes, setRoutes] = useState<Route[]>([]);
  useEffect(() => {
    const root = container.current;
    if (!root) {
      return;
    }
    const measure = () => {
      const origin = root.getBoundingClientRect();
      const rectOf = (id: string): Rect | undefined => {
        const element = root.querySelector(`[data-node="${CSS.escape(id)}"]`);
        if (!element) {
          return undefined;
        }
        const { left, top, right, bottom } = element.getBoundingClientRect();
        return {
          left: left - origin.left,
          top: top - origin.top,
          right: right - origin.left,
          bottom: bottom - origin.top,
        };
      };
      setRoutes(
        connectors.flatMap(({ id, from, to, dashed, accent }) => {
          const [a, b] = [rectOf(from), rectOf(to)];
          return a && b ? [{ id, points: routeOf(a, b), dashed, accent }] : [];
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll('[data-node]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [container, connectors]);
  return routes;
};

export type ConnectorLayerProps = {
  /** The positioned element the nodes sit in; the layer covers it. */
  container: RefObject<HTMLElement | null>;
  connectors: readonly Connector[];
};

/** Arrows drawn over a laid-out container, under its pointer events, from each node to the next. */
export const ConnectorLayer = ({ container, connectors }: ConnectorLayerProps) => {
  const routes = useRoutes(container, connectors);
  // One layer's marker is not another's, so several layers on a page keep their own heads.
  const marker = `definition-graph-arrow-${useId().replace(/:/g, '')}`;
  return (
    <svg className='dx-cover pointer-events-none overflow-visible' aria-hidden>
      <defs>
        <marker id={marker} viewBox='0 0 8 8' refX='7' refY='4' markerWidth='6' markerHeight='6' orient='auto'>
          <path d='M0 0 L8 4 L0 8 Z' className='fill-current' />
        </marker>
      </defs>
      {routes.map(({ id, points, dashed, accent }) => (
        <polyline
          key={id}
          points={points.map(([x, y]) => `${x},${y}`).join(' ')}
          className={mx('fill-none stroke-current', accent ? 'text-accent-text' : 'text-description')}
          strokeWidth={accent ? 2 : 1.5}
          strokeDasharray={dashed ? '5 4' : undefined}
          markerEnd={`url(#${marker})`}
          data-testid='definition-graph.connector'
        />
      ))}
    </svg>
  );
};
