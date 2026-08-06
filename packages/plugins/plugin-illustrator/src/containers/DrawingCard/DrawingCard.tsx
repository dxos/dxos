//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';

import { findVariant } from '#util';

import type * as Drawing from '../../types/Drawing';
import * as IllustratorCapabilities from '../../types/IllustratorCapabilities';

export type DrawingCardProps = AppSurface.ObjectCardProps<Drawing.Drawing>;

/** Resolves the drawing's canvas and delegates rendering to the variant claiming its schema. */
export const DrawingCard = ({ role, subject: drawing, editable }: DrawingCardProps) => {
  const variants = useCapabilities(IllustratorCapabilities.VariantProvider);
  const ref = drawing.canvas;
  const [snapshot] = useObject(ref);
  const canvas = snapshot ? ref.target : undefined;

  if (!canvas) {
    return null;
  }

  const match = findVariant(variants, canvas);
  if (!match?.card) {
    return null;
  }

  const Component = match.card;
  return <Component drawing={drawing} canvas={canvas} role={role} editable={editable} />;
};

DrawingCard.displayName = 'DrawingCard';

export default DrawingCard;
