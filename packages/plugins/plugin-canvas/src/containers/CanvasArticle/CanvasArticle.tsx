//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { Entity, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import {
  type Camera,
  type Element,
  type Node,
  type SceneId,
  SceneView,
  type SceneViewPropertiesProps,
  createLatticeProjection,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  isFrameNode,
  isLink,
  useRegistry,
} from '@dxos/react-ui-canvas/scene';
import * as Panel from '@dxos/react-ui/Panel';

import {
  type BoundCanvasStore,
  CanvasFrameNode,
  bindCanvasStore,
  canvasRecordOf,
  isCanvasDrawing,
  objectRef,
  objectUri,
  parseLinkedSceneId,
} from '#model';
import { CanvasCapabilities } from '#types';

import { CanvasDatabaseContext, CanvasFrameNodeView, CanvasFrameToolbar } from './CanvasFrameNodeView.tsx';
import { canvasViewAspect } from './view-state.ts';

export type CanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/** The article surface of the canvas variant: the scene engine over the drawing's canvas. */
export const CanvasArticle = ({ role, canvas }: CanvasArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const registry = useRegistry();
  const settings = useAtomValue(Hooks.useCapability(CanvasCapabilities.Settings));
  // The built-in node types and whatever other plugins contribute (a contribution may replace a built-in).
  const contributed = Hooks.useCapabilities(CanvasCapabilities.NodeType);
  // A frame showing an object (not a canvas drawing) opens it in the app; the frame's view shows the frame's own
  // scene until the object loads, so opening drills into that scene until then too.
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(canvas);
  const openObject = useCallback(
    (node: Node) => {
      const object = objectRef(node, db)?.target;
      if (!object || !isFrameNode(node) || parseLinkedSceneId(node.scene) || isCanvasDrawing(object) !== false) {
        return undefined;
      }
      return () => {
        void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] });
      };
    },
    [invokePromise, db],
  );
  const nodes = useMemo(
    () =>
      createNodeRegistry(
        {
          ...defaultNodeTypes,
          // The canvas's frame may show an object (`object`): a canvas drawing the store binds alongside, else a surface.
          frame: {
            ...defaultNodeTypes.frame,
            schema: CanvasFrameNode,
            component: CanvasFrameNodeView,
            toolbar: CanvasFrameToolbar,
            hostOpen: openObject,
          },
          ...Object.fromEntries(contributed.map(({ type, spec }) => [type, spec])),
        },
        defaultNodePrototypes,
      ),
    [contributed, openObject],
  );
  // Bound for the canvas's lifetime in this view; a new canvas rebinds.
  const [bound, setBound] = useState<BoundCanvasStore>();
  useEffect(() => {
    const next = bindCanvasStore(registry, canvas);
    setBound(next);
    return () => next.dispose();
  }, [registry, canvas]);

  // The drawing's settings, edited in the properties companion: the lattice picks the projection.
  const [snapshot] = useObject(canvas);
  const record = canvasRecordOf(snapshot.content);
  const lattice = record?.lattice === true;

  // Restores where the root scene was last left; read once per binding, since later values are our own writes.
  const contextId = Entity.getURI(canvas);
  const { camera: savedCamera } = useViewState(canvasViewAspect, contextId);
  const { update: updateViewState } = useViewStateActions(canvasViewAspect, contextId);
  const handleCameraChange = useCallback(
    (camera: Camera) => updateViewState((state) => ({ ...state, camera })),
    [updateViewState],
  );

  // A shape opens a scene of this drawing, never one bound from a linked drawing.
  const isLocalScene = useCallback((id: SceneId) => !parseLinkedSceneId(id), []);

  // A frame may show any object listed in the navtree but this drawing itself.
  const getOptions = useCallback<NonNullable<SceneViewPropertiesProps['getOptions']>>(
    (results) =>
      results
        // System objects (space properties, canvases, traces) have no place in the navtree, so none here either.
        .filter((result) => Obj.isObject(result) && TypeOptions.isUserObject(result))
        .filter((result) => !(Obj.instanceOf(Drawing.Drawing, result) && result.canvas.target === canvas))
        .map((result) => {
          const id = Entity.getURI(result, { prefer: 'named' });
          return { id, label: Entity.getLabel(result) ?? id };
        }),
    [canvas],
  );

  // A frame holds its own scene or an object, never both: it may take an object only while its own child scene is
  // empty, so linking never hides what was drawn there.
  const overrides = useCallback(
    (elements: readonly Element[]): ReturnType<NonNullable<SceneViewPropertiesProps['overrides']>> => {
      const scenes = bound ? registry.get(bound.store.scenes) : {};
      const locked = elements.some((element) => {
        if (isLink(element) || !isFrameNode(element) || objectUri(element) || parseLinkedSceneId(element.scene)) {
          return false;
        }
        const child = scenes[element.scene];
        return child !== undefined && Object.keys(child.nodes).length > 0;
      });
      // A frame showing an object opens the object (or a canvas drawing's root), not a scene of this one.
      const linked = elements.some((element) => !isLink(element) && objectUri(element));
      // The role applies only to an object shown as a surface, not to a canvas drawing shown as a scene; an object
      // still loading is offered one, so the field appears as soon as the object is picked.
      const surfaced = elements.some(
        (element) =>
          !isLink(element) && objectUri(element) && isCanvasDrawing(objectRef(element, db)?.target) === false,
      );
      return {
        ...(locked ? { object: { readonly: true } } : {}),
        ...(linked ? { scene: { hidden: true } } : {}),
        ...(surfaced ? {} : { role: { hidden: true } }),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registry, bound, db],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Body>
        {bound && (
          // An unset preference leaves the engine's own default in place.
          <CanvasDatabaseContext.Provider value={db}>
            <SceneView.Root
              key={bound.root}
              store={bound.store}
              root={bound.root}
              nodes={nodes}
              createProjection={lattice ? createLatticeProjection : undefined}
              grid={record?.grid}
              initialCamera={savedCamera}
              onCameraChange={handleCameraChange}
              panels={(settings.dockPanels ?? true) ? 'docked' : 'floating'}
            >
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
              <SceneView.Properties db={db} getOptions={getOptions} overrides={overrides} sceneFilter={isLocalScene} />
              <SceneView.Layers />
              <SceneView.About />
            </SceneView.Root>
          </CanvasDatabaseContext.Provider>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

CanvasArticle.displayName = 'CanvasArticle';
