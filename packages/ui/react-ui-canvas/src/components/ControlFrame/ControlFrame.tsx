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
import { type NodeRegistry } from '../../model/registry.ts';
import {
  type Bounds,
  type ElementId,
  type Link,
  type Node,
  type Point,
  type Port,
  type Scene,
  type SplineLink,
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
  selection: ReadonlySet<ElementId>;
  hover?: ElementId;
  selectedPoint?: ControlPointRef;
  zoom: number;
  drag?: Drag;
  /** Show every node's ports (a link tool); otherwise only the hovered and selected nodes'. */
  showPorts: boolean;
  onHandlePointerDown?: (node: Node, handle: Handle, event: React.PointerEvent) => void;
  onPortPointerDown?: (node: Node, port: Port, event: React.PointerEvent) => void;
  onEndPointerDown?: (link: Link, end: LinkEnd, event: React.PointerEvent) => void;
  onPointPointerDown?: (link: SplineLink, index: number, event: React.PointerEvent) => void;
  onPointContextMenu?: (link: SplineLink, index: number, event: React.MouseEvent) => void;
};

export const ControlFrame = memo(
  ({
    scene,
    registry,
    selection,
    hover,
    selectedPoint,
    zoom,
    drag,
    showPorts,
    onHandlePointerDown,
    onPortPointerDown,
    onEndPointerDown,
    onPointPointerDown,
    onPointContextMenu,
  }: ControlFrameProps) => {
    const unit = 1 / Math.max(zoom, 0.05);
    const handleSize = 8 * unit;
    const portRadius = 5 * unit;
    const selectedNodes = [...selection].map((id) => scene.nodes[id]).filter((node) => node !== undefined);
    const selectedLinks = [...selection].map((id) => scene.links[id]).filter((link) => link !== undefined);
    const single = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
    // With a link tool every node offers its ports; otherwise only the selection and the hovered node.
    const portNodes = new Set<Node>(showPorts ? Object.values(scene.nodes) : selectedNodes);
    const hovered = hover ? scene.nodes[hover] : undefined;
    if (hovered) {
      portNodes.add(hovered);
    }
    // Pointer capture during a link drag suppresses hover, so the drop target shows its ports itself.
    const dropTarget =
      (drag?.kind === 'link' || drag?.kind === 'end') && drag.target ? scene.nodes[drag.target.node] : undefined;
    if (dropTarget) {
      portNodes.add(dropTarget);
    }
    const marquee = drag?.kind === 'marquee' ? boundsFromPoints(drag.from, drag.to) : undefined;
    const create = drag?.kind === 'create' ? boundsFromPoints(drag.from, drag.to) : undefined;
    // Over a drop target the layer already draws the provisional link; the band only reaches free space.
    const band =
      drag?.kind === 'link' && !drag.target
        ? { from: { point: drag.from, side: drag.fromSide }, to: drag.to }
        : drag?.kind === 'end' && !drag.target
          ? { from: { point: drag.fixed, side: drag.fixedSide }, to: drag.to }
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
        {single && registry[single.type].resizable && !single.locked && (
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
        {[...portNodes].map((node) => {
          const bounds = nodeBounds(node);
          return nodePorts(registry, node).map((port) => {
            const point = portPoint(bounds, port);
            // Filled while it is an end of the drag in progress: the source, or the port it would drop on.
            const active =
              (drag?.kind === 'link' && drag.source.node === node.id && drag.source.port === port.id) ||
              ((drag?.kind === 'link' || drag?.kind === 'end') &&
                drag.target?.node === node.id &&
                drag.target.port === port.id);
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
        {selectedLinks.map((link) => {
          const geometry = linkGeometry(scene, registry, link);
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
        {create && (
          <rect
            x={create.x}
            y={create.y}
            width={create.width}
            height={create.height}
            className='fill-none stroke-primary-500'
            strokeWidth={unit}
            strokeDasharray={`${6 * unit} ${4 * unit}`}
          />
        )}
      </svg>
    );
  },
);

ControlFrame.displayName = 'ControlFrame';
