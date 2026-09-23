//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';
import React, { Fragment, useCallback, useEffect, useMemo } from 'react';

import { AiService } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useCapability } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as OperationRegistry from '@dxos/compute/OperationRegistry';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { ComputeGraphModel } from '@dxos/conductor';
import { Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Flex, type FlexProps } from '@dxos/react-ui';
import {
  Bullets,
  ComputeContext,
  ComputeGraphController,
  boardSceneId,
  computeNodeRegistry,
  computeShapes,
  createComputeProjection,
  createEchoStore,
} from '@dxos/react-ui-canvas-compute';
import { type CanvasBoard, KeyboardContainer, ShapeRegistry } from '@dxos/react-ui-canvas-editor';
import {
  type FreehandProjectionOptions,
  SceneView,
  createSceneViewAtoms,
  useRegistry,
  useSceneProjection,
} from '@dxos/react-ui-canvas/scene';

export type CanvasArticleProps = AppSurface.ObjectArticleProps<CanvasBoard.CanvasBoard>;

/**
 * The board on the scene engine (MIGRATION.md M4): `SceneView` over an ECHO store of the board's own
 * layout, with the compute projection keeping the compute graph in step. The editor's own canvas,
 * graph model and monitor are gone — the store is the persistence and the projection is the mirror.
 */
export const CanvasArticle = ({ role, subject, attendableId: _attendableId }: CanvasArticleProps) => {
  const controller = useGraphController(subject);
  if (!controller) {
    return null;
  }

  // The scene is everything below: a board without its compute graph has no projection to render through.
  return <CanvasScene role={role} subject={subject} controller={controller} />;
};

CanvasArticle.displayName = 'CanvasArticle';

type CanvasSceneProps = Pick<CanvasArticleProps, 'role' | 'subject'> & { controller: ComputeGraphController };

const CanvasScene = ({ role, subject, controller }: CanvasSceneProps) => {
  const id = Obj.getURI(subject);
  const registry = useRegistry();
  const shapeRegistry = useMemo(() => new ShapeRegistry(computeShapes), []);
  const store = useMemo(() => createEchoStore(subject), [subject]);
  const sceneId = useMemo(() => boardSceneId(subject), [subject]);
  const atoms = useMemo(() => createSceneViewAtoms(sceneId), [sceneId]);
  const createProjection = useCallback(
    (options: FreehandProjectionOptions) => createComputeProjection({ ...options, controller }),
    [controller],
  );
  const projection = useSceneProjection({ store, atoms, createProjection });

  // A function body opening grows its node through the model, so its links re-route with it.
  const resize = useCallback(
    (nodeId: string, delta: number) => {
      const node = registry.get(projection.scene).nodes[nodeId];
      if (node) {
        projection.apply({
          kind: 'update',
          id: nodeId,
          values: { size: { width: node.size.width, height: node.size.height + delta } },
        });
      }
    },
    [registry, projection],
  );

  const Root = role === AppSurface.Section.role ? Container : Fragment;

  return (
    <ComputeContext.Provider value={{ controller, registry: shapeRegistry, resize }}>
      <Root>
        <KeyboardContainer id={id}>
          <SceneView.Root
            store={store}
            root={sceneId}
            atoms={atoms}
            nodes={computeNodeRegistry}
            projection={projection}
          >
            <SceneView.Canvas overlay={<Bullets controller={controller} projection={projection} />} />
            <SceneView.Navigation />
            <SceneView.Actions />
            <SceneView.Debug />
            <SceneView.Palette />
          </SceneView.Root>
        </KeyboardContainer>
      </Root>
    </ComputeContext.Provider>
  );
};

const Container = (props: FlexProps) => <Flex {...props} classNames='aspect-square w-full max-h-full min-h-0' />;

const useGraphController = (canvas: CanvasBoard.CanvasBoard) => {
  const db = Obj.getDatabase(canvas);
  const processManagerRuntime = useCapability(Capabilities.ProcessManagerRuntime);
  const [computeGraph] = useObject(canvas.computeGraph);
  const controller = useMemo(() => {
    if (!canvas.computeGraph?.target || !db) {
      return null;
    }
    const spaceId = db.spaceId;
    const model = new ComputeGraphModel(canvas.computeGraph?.target);
    const spaceLayer = ServiceResolver.provide(
      { space: spaceId },
      AiService.AiService,
      Database.Service,
      Credential.CredentialsService,
      Operation.Service,
      OperationRegistry.Service,
    );
    const computeGraphRuntime = {
      runPromiseExit: <A, E>(effect: Effect.Effect<A, E, any>): Promise<Exit.Exit<A, E>> =>
        processManagerRuntime.runPromiseExit(effect.pipe(Effect.provide(spaceLayer)) as any) as Promise<
          Exit.Exit<A, E>
        >,
    };
    const controller = new ComputeGraphController(computeGraphRuntime, model);
    return controller;
  }, [computeGraph, db, processManagerRuntime]);

  useEffect(() => {
    if (!controller) {
      return;
    }

    void controller.open();
    return () => {
      void controller.close();
    };
  }, [controller]);

  // Structural edits from other peers (or undo) land in the object, not through the model.
  useEffect(() => {
    const root = canvas.computeGraph?.target;
    if (!root || !controller) {
      return;
    }

    return Obj.subscribe(root, () => controller.graph.sync());
  }, [canvas.computeGraph?.target, controller]);

  return controller;
};
