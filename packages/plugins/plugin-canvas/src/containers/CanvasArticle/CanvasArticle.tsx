//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { Panel } from '@dxos/react-ui';
import { SceneView, useRegistry } from '@dxos/react-ui-canvas/scene';

import { type BoundCanvasStore, bindCanvasStore } from '#model';
import { CanvasCapabilities } from '#types';

export type CanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/** The article surface of the canvas variant: the scene engine over the drawing's canvas. */
export const CanvasArticle = ({ role, canvas }: CanvasArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const registry = useRegistry();
  const settings = useAtomValue(useCapability(CanvasCapabilities.Settings));
  // Bound for the canvas's lifetime in this view; a new canvas rebinds.
  const [bound, setBound] = useState<BoundCanvasStore>();
  useEffect(() => {
    const next = bindCanvasStore(registry, canvas);
    setBound(next);
    return () => next.dispose();
  }, [registry, canvas]);

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        {bound && (
          // An unset preference leaves the engine's own default in place.
          <SceneView.Root key={bound.root} store={bound.store} root={bound.root}>
            <SceneView.Canvas liveDepth={settings.liveDepth} />
            {settings.showToolbar && (
              <>
                <SceneView.Navigation />
                <SceneView.Actions />
                <SceneView.Debug />
              </>
            )}
            {settings.showPalette && <SceneView.Palette />}
          </SceneView.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

CanvasArticle.displayName = 'CanvasArticle';
