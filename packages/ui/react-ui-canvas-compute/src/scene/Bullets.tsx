//
// Copyright 2026 DXOS.org
//

//
// The editor's bullets over the shared editor: a dot runs along a link's path when the compute node at its source emits
// the property the link carries. Each dot is drawn beside the path it follows, in the path's own coordinates; the paths
// are found by the link id the 2D viewport stamps on them.
//

import React, { useEffect, useRef } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { useSceneEditor } from '@dxos/react-ui-canvas';
import { type Scene, findLayout } from '@dxos/scene';

import { type ComputeGraphController } from '../graph/index.ts';
import { parseAnchorId } from '../shapes/index.ts';

const RADIUS = 3;
const DURATION_MS = 500;
const MAX_BULLETS = 32;
const BULLET_CLASS = 'fill-orange-500';

export type BulletsProps = {
  controller: ComputeGraphController;
};

/** The ids of the links leaving the compute node `nodeId` through `property`. */
const outgoing = (layout: Scene.LayoutRecord | undefined, nodeId: string, property: string): string[] =>
  layout?.dim !== '2d'
    ? []
    : Object.values(layout.elements).flatMap(({ id, type, source }) => {
        const node = layout.elements[source?.node ?? ''];
        const port = source?.port;
        return type === 'link' && node?.node === nodeId && (port ? parseAnchorId(port)[1] : DEFAULT_OUTPUT) === property
          ? [id]
          : [];
      });

/** Renders nothing itself: it marks where in the page the editor's viewport is. */
export const Bullets = ({ controller }: BulletsProps) => {
  const { document, layout } = useSceneEditor('Bullets');
  const latest = useRef({ document, layout });
  latest.current = { document, layout };
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      controller.output.on(({ nodeId, property, value }) => {
        const root = viewportOf(markerRef.current);
        if (!root || value.type === 'not-executed') {
          return;
        }
        const { document, layout } = latest.current;
        const record = layout === undefined ? undefined : findLayout(document, layout);
        for (const id of outgoing(record, nodeId, property)) {
          const path = root.querySelector(`path[data-link-id="${id}"]`);
          if (path instanceof SVGPathElement && root.querySelectorAll(`circle.${BULLET_CLASS}`).length < MAX_BULLETS) {
            fireBullet(path);
          }
        }
      }),
    [controller],
  );

  return <span ref={markerRef} hidden />;
};

/** The nearest element around `marker` that holds the scene view. */
const viewportOf = (marker: Element | null): Element | undefined => {
  for (let element = marker?.parentElement; element; element = element.parentElement) {
    if (element.querySelector('[data-testid="scene-view"]')) {
      return element;
    }
  }
  return undefined;
};

/** One dot from the path's start to its end, removed when it arrives. */
const fireBullet = (path: SVGPathElement) => {
  const bullet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bullet.setAttribute('r', String(RADIUS));
  bullet.setAttribute('class', BULLET_CLASS);
  bullet.setAttribute('pointer-events', 'none');
  path.after(bullet);
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
