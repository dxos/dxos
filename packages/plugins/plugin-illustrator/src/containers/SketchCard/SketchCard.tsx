//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';

import { IllustratorCapabilities, type Sketch } from '#types';

export type SketchCardProps = AppSurface.ObjectCardProps<Sketch.Sketch>;

/** Resolves the sketch's canvas and delegates rendering to the matching variant's card. */
export const SketchCard = ({ role, subject: sketch, editable }: SketchCardProps) => {
  const variants = useCapabilities(IllustratorCapabilities.VariantProvider);
  const ref = sketch.canvas as Ref.Ref<Obj.Unknown>;
  // Subscribe via the snapshot for load/re-render, but hand variants the LIVE object —
  // their store adapters need `Doc.createAccessor`, which rejects snapshots.
  const [snapshot] = useObject(ref);
  const canvas = snapshot ? ref.target : undefined;

  if (!canvas) {
    return null;
  }

  const typename = Obj.getTypename(canvas);
  const match = variants.find((variant) => variant.id === typename);
  if (!match?.card) {
    return null;
  }

  const Component = match.card;
  return <Component sketch={sketch} canvas={canvas} role={role} editable={editable} />;
};

SketchCard.displayName = 'SketchCard';

export default SketchCard;
