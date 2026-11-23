//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Obj } from '@dxos/echo';

import { Drawing, type IllustratorCapabilities } from '#types';

export type VariantSurfaceProps = Omit<IllustratorCapabilities.DrawingVariantSurfaceProps<Obj.Unknown>, 'canvas'> & {
  variant: IllustratorCapabilities.DrawingVariant;
  slot: 'card' | 'article';
  canvas: Obj.Unknown;
};

/** Whether the variant has a component for `slot` that can show `canvas`. */
export const hasVariantSurface = (
  variant: IllustratorCapabilities.DrawingVariant | undefined,
  slot: VariantSurfaceProps['slot'],
  canvas: Obj.Unknown | undefined,
): boolean => variant?.[slot] !== undefined && (variant.canvasType !== undefined || Drawing.isCanvas(canvas));

/**
 * A variant's card or article for `canvas`: a base-canvas variant is handed the canvas as a `Drawing.Canvas`, a
 * typed variant as its own type, so each renderer sees the canvas it stores.
 */
export const VariantSurface = ({ variant, slot, canvas, ...props }: VariantSurfaceProps) => {
  if (variant.canvasType === undefined) {
    const Component = variant[slot];
    return Component && Drawing.isCanvas(canvas) ? <Component {...props} canvas={canvas} /> : null;
  }
  const Component = variant[slot];
  return Component ? <Component {...props} canvas={canvas} /> : null;
};
