//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Entity, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import {
  type Element,
  SceneView,
  type SceneViewPropertiesProps,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  isLink,
  isPortalNode,
  useRegistry,
} from '@dxos/react-ui-canvas/scene';
import * as Panel from '@dxos/react-ui/Panel';

import { type BoundCanvasStore, CanvasSceneNode, bindCanvasStore, drawingUri, parseLinkedSceneId } from '#model';
import { Canvas, CanvasCapabilities } from '#types';

export type CanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/** The article surface of the canvas variant: the scene engine over the drawing's canvas. */
export const CanvasArticle = ({ role, canvas }: CanvasArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const registry = useRegistry();
  const settings = useAtomValue(Hooks.useCapability(CanvasCapabilities.Settings));
  // The built-in node types and whatever other plugins contribute (a contribution may replace a built-in).
  const contributed = Hooks.useCapabilities(CanvasCapabilities.NodeType);
  const nodes = useMemo(
    () =>
      createNodeRegistry(
        {
          ...defaultNodeTypes,
          // The canvas's scene shape may show another drawing (`drawing`), which the store binds alongside.
          scene: { ...defaultNodeTypes.scene, schema: CanvasSceneNode },
          ...Object.fromEntries(contributed.map(({ type, spec }) => [type, spec])),
        },
        defaultNodePrototypes,
      ),
    [contributed],
  );
  // Bound for the canvas's lifetime in this view; a new canvas rebinds.
  const [bound, setBound] = useState<BoundCanvasStore>();
  useEffect(() => {
    const next = bindCanvasStore(registry, canvas);
    setBound(next);
    return () => next.dispose();
  }, [registry, canvas]);

  const db = Obj.getDatabase(canvas);

  // A scene shape links only to another canvas drawing: never to itself, nor to a drawing of another renderer.
  const getOptions = useCallback<NonNullable<SceneViewPropertiesProps['getOptions']>>(
    (results) =>
      results
        .filter((result) => {
          if (!Obj.instanceOf(Drawing.Drawing, result)) {
            return false;
          }
          const target = result.canvas.target;
          return target !== canvas && (target === undefined || target.schema === Canvas.SCENE_SCHEMA);
        })
        .map((result) => {
          const id = Entity.getURI(result, { prefer: 'named' });
          return { id, label: Entity.getLabel(result) ?? id };
        }),
    [canvas],
  );

  // A shape may take a drawing only while its own child scene is empty, so linking never hides what was drawn there.
  const overrides = useCallback(
    (elements: readonly Element[]): ReturnType<NonNullable<SceneViewPropertiesProps['overrides']>> => {
      const scenes = bound ? registry.get(bound.store.scenes) : {};
      const locked = elements.some((element) => {
        if (isLink(element) || !isPortalNode(element) || drawingUri(element) || parseLinkedSceneId(element.scene)) {
          return false;
        }
        const child = scenes[element.scene];
        return child !== undefined && Object.keys(child.nodes).length > 0;
      });
      return locked ? { drawing: { readonly: true } } : {};
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registry, bound],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Body>
        {bound && (
          // An unset preference leaves the engine's own default in place.
          <SceneView.Root key={bound.root} store={bound.store} root={bound.root} nodes={nodes}>
            <SceneView.Canvas liveDepth={settings.liveDepth} />
            {/* Unset means shown: settings saved before the default existed hold neither key. */}
            {(settings.showToolbar ?? true) && (
              <>
                <SceneView.Navigation />
                <SceneView.Actions />
                <SceneView.Debug />
              </>
            )}
            {(settings.showPalette ?? true) && <SceneView.Palette />}
            {/* Floats over the canvas while something is selected; renders nothing otherwise. */}
            <SceneView.Properties db={db} getOptions={getOptions} overrides={overrides} />
          </SceneView.Root>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

CanvasArticle.displayName = 'CanvasArticle';
