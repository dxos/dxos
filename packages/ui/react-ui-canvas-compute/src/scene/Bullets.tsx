//
// Copyright 2026 DXOS.org
//

//
// The editor's bullets over the scene engine: a dot runs along a link's path when the compute node at
// its source emits the property the link carries. Drawn as an overlay in scene coordinates; the paths
// are found by the link id the layer stamps on them.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useEffect, useRef } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { type Projection, type Scene, endpointNode } from '@dxos/react-ui-canvas/scene';

import { type ComputeGraphController } from '../graph/index.ts';
import { parseAnchorId } from '../shapes/index.ts';

const RADIUS = 3;
const DURATION_MS = 500;
const MAX_BULLETS = 32;

export type BulletsProps = {
  controller: ComputeGraphController;
  projection: Projection;
};

/** Links leaving the compute node `nodeId` through `property`. */
const outgoing = (scene: Scene, nodeId: string, property: string) =>
  Object.values(scene.links).filter((link) => {
    const source = endpointNode(link.source);
    const node = source ? scene.nodes[source] : undefined;
    if (!node || !('node' in node) || node.node !== nodeId) {
      return false;
    }
    const port = 'port' in link.source ? link.source.port : undefined;
    return (port ? parseAnchorId(port)[1] : DEFAULT_OUTPUT) === property;
  });

export const Bullets = ({ controller, projection }: BulletsProps) => {
  const scene = useAtomValue(projection.scene);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const layerRef = useRef<SVGGElement>(null);

  useEffect(
    () =>
      controller.output.on(({ nodeId, property, value }) => {
        const layer = layerRef.current;
        const root = layer?.closest('[data-testid="scene-view"]');
        if (!layer || !root || value.type === 'not-executed') {
          return;
        }
        for (const link of outgoing(sceneRef.current, nodeId, property)) {
          const path = root.querySelector(`path[data-link-id="${link.id}"]`);
          if (path instanceof SVGPathElement && layer.childElementCount < MAX_BULLETS) {
            fireBullet(layer, path);
          }
        }
      }),
    [controller],
  );

  return (
    <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
      <g ref={layerRef} />
    </svg>
  );
};

/** One dot from the path's start to its end, removed when it arrives. */
const fireBullet = (layer: SVGGElement, path: SVGPathElement) => {
  const bullet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bullet.setAttribute('r', String(RADIUS));
  bullet.setAttribute('class', 'fill-orange-500');
  layer.append(bullet);
  const length = path.getTotalLength();
  const started = performance.now();
  const step = (now: number) => {
    const t = Math.min((now - started) / DURATION_MS, 1);
    const point = path.getPointAtLength(length * t);
    bullet.setAttribute('cx', String(point.x));
    bullet.setAttribute('cy', String(point.y));
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      bullet.remove();
    }
  };
  requestAnimationFrame(step);
};
