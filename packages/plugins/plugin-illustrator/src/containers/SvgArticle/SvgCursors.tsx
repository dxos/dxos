//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type Scene } from '@dxos/diagram';
import { type Obj } from '@dxos/echo';
import { type CursorProjection, RemoteCursorLayer } from '@dxos/react-ui-attention';

export type SvgCursorsProps = {
  object: Obj.Unknown;
  /** The rendered scene; the diagram's viewBox follows its content, so a change re-places the cursors. */
  scene: readonly Scene.WorldObject[];
};

/** The diagram's viewBox-to-client transform and the layer's client rect; viewBox units are what peers share. */
const measure = (layer: HTMLElement) => {
  const ctm = layer.parentElement?.querySelector<SVGSVGElement>(':scope > svg')?.getScreenCTM();
  return ctm ? { ctm, rect: layer.getBoundingClientRect() } : undefined;
};

const makeProjection = (): CursorProjection => ({
  fromLayer: (point, layer) => {
    const measured = measure(layer);
    if (!measured) {
      return undefined;
    }
    const { x, y } = new DOMPoint(point.x + measured.rect.left, point.y + measured.rect.top).matrixTransform(
      measured.ctm.inverse(),
    );
    return { x, y };
  },
  toLayer: (point, layer) => {
    const measured = measure(layer);
    if (!measured) {
      return undefined;
    }
    const { x, y } = new DOMPoint(point.x, point.y).matrixTransform(measured.ctm);
    return { x: x - measured.rect.left, y: y - measured.rect.top };
  },
});

/**
 * Collaborators' pointers over a rendered diagram. Must render beside the `<svg>`, in the positioned element that
 * contains it.
 */
export const SvgCursors = ({ object, scene }: SvgCursorsProps) => {
  const { cursors, update } = ToolkitHooks.usePointerCursors(object);
  const projection = useMemo(makeProjection, [scene]);
  return <RemoteCursorLayer cursors={cursors} projection={projection} onPointerChange={update} />;
};
