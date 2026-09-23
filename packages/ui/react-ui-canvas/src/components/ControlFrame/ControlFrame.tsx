//
// Copyright 2026 DXOS.org
//

//
// Overlay in scene coordinates (§7 layer 3): selection outlines, resize handles, ports, link end and
// control points, the marquee and the link rubber band. Sizes are divided by zoom because the parent
// transform scales the SVG.
//

import React, { memo } from 'react';

import { mx } from '@dxos/ui-theme';

import { type ControlPointRef, type Drag, type Handle } from '../../model/atoms.ts';
import { type NodeRegistry, nodeDef } from '../../model/registry.ts';
import {
  type Bounds,
  type Capabilities,
  type ElementId,
  type Endpoint,
  type Link,
  type Node,
  type Point,
  type Port,
  type Scene,
  type SplineLink,
  endpointNode,
  isPointEndpoint,
} from '../../model/types.ts';
import { boundsFromPoints } from '../../utils/hit.ts';
import { nodePorts, oppositeSide, portPoint } from '../../utils/ports.ts';
import { curvePath, linkGeometry } from '../../utils/route.ts';
import { nodeBounds } from '../../utils/shapes.ts';

const HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export const handlePoint = (bounds: Bounds, handle: Handle): Point => {
  const x = handle.includes('w')
    ? bounds.x
    : handle.includes('e')
      ? bounds.x + bounds.width
      : bounds.x + bounds.width / 2;
  const y = handle.includes('n')
    ? bounds.y
    : handle.includes('s')
      ? bounds.y + bounds.height
      : bounds.y + bounds.height / 2;
  return { x, y };
};

const cursorFor = (handle: Handle) =>
  ({ n: 'ns', s: 'ns', e: 'ew', w: 'ew', ne: 'nesw', sw: 'nesw', nw: 'nwse', se: 'nwse' })[handle] + '-resize';

export type LinkEnd = 'source' | 'target';

export type ControlFrameProps = {
  scene: Scene;
  registry: NodeRegistry;
  /** What the view may do: no handle is drawn for a gesture that could not apply. */
  capabilities: Capabilities;
  selection: ReadonlySet<ElementId>;
  hover?: ElementId;
  selectedPoint?: ControlPointRef;
  zoom: number;
  drag?: Drag;
  /** The bounds a create gesture in flight would land, drawn as a provisional frame. */
  createFrame?: Bounds;
  onHandlePointerDown?: (node: Node, handle: Handle, event: React.PointerEvent) => void;
  onPortPointerDown?: (node: Node, port: Port, event: React.PointerEvent) => void;
  onEndPointerDown?: (link: Link, end: LinkEnd, event: React.PointerEvent) => void;
  onPointPointerDown?: (link: SplineLink, index: number, event: React.PointerEvent) => void;
  /** `index` is where in the link's points a control point at `point` would be inserted. */
  onMidpointPointerDown?: (link: SplineLink, index: number, point: Point, event: React.PointerEvent) => void;
  onPointContextMenu?: (link: SplineLink, index: number, event: React.MouseEvent) => void;
};

/** The midpoint of every span of a spline's polyline, each with the index a control point there takes. */
const midpoints = (source: Point, points: readonly Point[], target: Point) => {
  const vertices = [source, ...points, target];
  return vertices.slice(1).map((vertex, index) => ({
    index,
    point: { x: (vertices[index].x + vertex.x) / 2, y: (vertices[index].y + vertex.y) / 2 },
  }));
};

export const ControlFrame = memo(
  ({
    scene,
    registry,
    capabilities,
    selection,
    hover,
    selectedPoint,
    zoom,
    drag,
    createFrame,
    onHandlePointerDown,
    onPortPointerDown,
    onEndPointerDown,
    onPointPointerDown,
    onMidpointPointerDown,
    onPointContextMenu,
  }: ControlFrameProps) => {
    const unit = 1 / Math.max(zoom, 0.05);
    const handleSize = 8 * unit;
    const portRadius = 5 * unit;
    const midpointRadius = 4 * unit;
    const selectedNodes = [...selection].map((id) => scene.nodes[id]).filter((node) => node !== undefined);
    const selectedLinks = [...selection].map((id) => scene.links[id]).filter((link) => link !== undefined);
    const single = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
    // Only the node under the pointer: every node's ports at once is a field of dots that hides the
    // diagram the user is drawing, and a link can start from a body now, so they are a refinement
    // rather than the only way in.
    const portNodes = new Set<Node>();
    const hovered = hover ? scene.nodes[hover] : undefined;
    if (hovered && capabilities.link) {
      portNodes.add(hovered);
    }
    // Pointer capture during a link drag suppresses hover, so the drop target shows its ports itself.
    const dropNode = (drag?.kind === 'link' || drag?.kind === 'end') && drag.target && endpointNode(drag.target);
    const dropTarget = dropNode ? scene.nodes[dropNode] : undefined;
    if (dropTarget) {
      portNodes.add(dropTarget);
    }
    const marquee = drag?.kind === 'marquee' ? boundsFromPoints(drag.from, drag.to) : undefined;
    // The layer draws every provisional link that will land (over a target, or free-ended); the band is only
    // a port drag over free space, where dropping would create a node rather than a free end.
    const band =
      drag?.kind === 'link' && !drag.target && !isPointEndpoint(drag.source)
        ? { from: { point: drag.from, side: drag.fromSide }, to: drag.to }
        : undefined;

    return (
      <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
        {selectedNodes.map((node) => {
          const bounds = nodeBounds(node);
          return (
            <rect
              key={node.id}
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              className='fill-none stroke-primary-500'
              strokeWidth={unit}
            />
          );
        })}
        {[...portNodes].map((node) => {
          const bounds = nodeBounds(node);
          return nodePorts(registry, node).map((port) => {
            const point = portPoint(bounds, port);
            // Filled while it is an end of the drag in progress: the source, or the port it would drop on.
            const isEnd = (end: Endpoint | undefined) =>
              end !== undefined && !isPointEndpoint(end) && end.node === node.id && end.port === port.id;
            const active =
              (drag?.kind === 'link' && isEnd(drag.source)) ||
              ((drag?.kind === 'link' || drag?.kind === 'end') && isEnd(drag.target));
            return (
              <circle
                key={`${node.id}/${port.id}`}
                cx={point.x}
                cy={point.y}
                r={portRadius}
                className={mx(
                  'stroke-primary-500 pointer-events-auto cursor-crosshair hover:fill-primary-500',
                  active ? 'fill-primary-500' : 'fill-base-surface',
                )}
                strokeWidth={unit}
                onPointerDown={(event) => onPortPointerDown?.(node, port, event)}
              />
            );
          });
        })}
        {/* Handles after the ports so a handle wins where a port sits on the same point (a side centre). */}
        {single && capabilities.resize && nodeDef(registry, single)?.resizable && !single.locked && (
          <g>
            {HANDLES.map((handle) => {
              const point = handlePoint(nodeBounds(single), handle);
              return (
                <rect
                  key={handle}
                  x={point.x - handleSize / 2}
                  y={point.y - handleSize / 2}
                  width={handleSize}
                  height={handleSize}
                  className='fill-base-surface stroke-primary-500 pointer-events-auto'
                  strokeWidth={unit}
                  style={{ cursor: cursorFor(handle) }}
                  onPointerDown={(event) => onHandlePointerDown?.(single, handle, event)}
                />
              );
            })}
          </g>
        )}
        {/* A link's end and control-point handles all move it, so they follow the `update` capability together. */}
        {selectedLinks.map((link) => {
          const geometry = capabilities.update ? linkGeometry(scene, registry, link) : undefined;
          if (!geometry) {
            return null;
          }
          const points =
            link.type === 'spline' ? (drag?.kind === 'point' && drag.id === link.id ? drag.points : link.points) : [];
          const ends: [LinkEnd, Point][] = [
            ['source', geometry.source.point],
            ['target', geometry.target.point],
          ];
          return (
            <g key={link.id}>
              {ends.map(([end, point]) => (
                <circle
                  key={end}
                  cx={point.x}
                  cy={point.y}
                  r={portRadius}
                  className={mx(
                    'stroke-primary-500 pointer-events-auto cursor-move hover:fill-primary-500',
                    drag?.kind === 'end' && drag.id === link.id && drag.end === end
                      ? 'fill-primary-500'
                      : 'fill-base-surface',
                  )}
                  strokeWidth={unit}
                  onPointerDown={(event) => onEndPointerDown?.(link, end, event)}
                />
              ))}
              {/* Midpoints first, so a control point wins wherever the two land on each other. */}
              {link.type === 'spline' &&
                midpoints(geometry.source.point, points, geometry.target.point).map(({ index, point }) => (
                  <circle
                    key={`midpoint-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={midpointRadius}
                    className='fill-primary-500/40 pointer-events-auto cursor-copy hover:fill-primary-500'
                    onPointerDown={(event) => onMidpointPointerDown?.(link, index, point, event)}
                  />
                ))}
              {link.type === 'spline' &&
                points.map((point, index) => (
                  <rect
                    key={index}
                    x={point.x - handleSize / 2}
                    y={point.y - handleSize / 2}
                    width={handleSize}
                    height={handleSize}
                    transform={`rotate(45 ${point.x} ${point.y})`}
                    className={mx(
                      'stroke-primary-500 pointer-events-auto cursor-move hover:fill-primary-500',
                      selectedPoint?.link === link.id && selectedPoint.index === index
                        ? 'fill-primary-500'
                        : 'fill-base-surface',
                    )}
                    strokeWidth={unit}
                    onPointerDown={(event) => onPointPointerDown?.(link, index, event)}
                    onContextMenu={(event) => onPointContextMenu?.(link, index, event)}
                  />
                ))}
            </g>
          );
        })}
        {band && (
          <path
            d={curvePath(band.from, { point: band.to, side: oppositeSide(band.from.side) })}
            className='fill-none stroke-primary-500'
            strokeWidth={2 * unit}
            strokeDasharray={`${6 * unit} ${4 * unit}`}
          />
        )}
        {marquee && (
          <rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.width}
            height={marquee.height}
            className='fill-primary-500/10 stroke-primary-500'
            strokeWidth={unit}
          />
        )}
        {createFrame && (
          <rect
            data-testid='create-frame'
            x={createFrame.x}
            y={createFrame.y}
            width={createFrame.width}
            height={createFrame.height}
            className='fill-primary-500/10 stroke-primary-500'
            strokeWidth={unit}
          />
        )}
      </svg>
    );
  },
);

ControlFrame.displayName = 'ControlFrame';
