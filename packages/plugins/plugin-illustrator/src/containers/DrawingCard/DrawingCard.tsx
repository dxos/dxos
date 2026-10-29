//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useObject } from '@dxos/echo-react';

import { VariantSurface } from '#components';
import { Drawing, IllustratorCapabilities } from '#types';

export type DrawingCardProps = AppSurface.ObjectCardProps<Drawing.Drawing>;

/** Resolves the drawing's canvas and delegates rendering to the variant claiming its schema. */
export const DrawingCard = ({ role, subject: drawing, editable }: DrawingCardProps) => {
  const variants = Hooks.useCapabilities(IllustratorCapabilities.VariantProvider);
  const ref = drawing.canvas;
  const [snapshot] = useObject(ref);
  const canvas = snapshot ? ref.target : undefined;

  if (!canvas) {
    return null;
  }

  const match = IllustratorCapabilities.variantFor(canvas, variants);
  if (!match?.card) {
    return null;
  }

  return (
    <VariantSurface variant={match} slot='card' drawing={drawing} canvas={canvas} role={role} editable={editable} />
  );
};

DrawingCard.displayName = 'DrawingCard';

export default DrawingCard;
