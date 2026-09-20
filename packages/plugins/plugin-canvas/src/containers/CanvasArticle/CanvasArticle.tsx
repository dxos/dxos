//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { Panel } from '@dxos/react-ui';
import { SceneView, useRegistry } from '@dxos/react-ui-canvas/scene';

import { type BoundCanvasStore, bindCanvasStore } from '#model';

export type CanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/** The article surface of the canvas variant: the scene engine over the drawing's canvas. */
export const CanvasArticle = ({ role, canvas }: CanvasArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const registry = useRegistry();
  // Bound for the canvas's lifetime in this view; a new canvas rebinds.
  const [bound, setBound] = useState<BoundCanvasStore>();
  useEffect(() => {
    const next = bindCanvasStore(registry, canvas);
    setBound(next);
    return () => next.dispose();
  }, [registry, canvas]);

  return (
    <Panel.Root role={role}>
      <Panel.Content>{bound && <SceneView key={bound.root} store={bound.store} root={bound.root} />}</Panel.Content>
    </Panel.Root>
  );
};

CanvasArticle.displayName = 'CanvasArticle';
