//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import React, { Fragment, useCallback, useEffect, useMemo } from 'react';

import { AiService } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as OperationRegistry from '@dxos/compute/OperationRegistry';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { ComputeGraphModel } from '@dxos/conductor';
import { Database, Obj, Registry } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import {
  Bullets,
  type CanvasBoard,
  ComputeContext,
  ComputeGraphController,
  type ComputeServices,
  boardViewId,
  computeNodeRegistry,
  createComputeProjection,
  createEchoStore,
} from '@dxos/react-ui-canvas-compute';
import {
  Canvas,
  type FreehandProjectionOptions,
  createCanvasAtoms,
  useCanvasHistory,
  useRegistry,
  useViewProjection,
} from '@dxos/react-ui-canvas/scene';
import * as Layout from '@dxos/react-ui/Layout';

export type CanvasArticleProps = AppSurface.ObjectArticleProps<CanvasBoard.CanvasBoard>;

/**
 * The board on the scene engine (MIGRATION.md M4): `Canvas` over an ECHO store of the board's own
 * layout, with the compute projection keeping the compute graph in step. The editor's own canvas,
 * graph model and monitor are gone - the store is the persistence and the projection is the mirror.
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
  const registry = useRegistry();
  const store = useMemo(() => createEchoStore(subject), [subject]);
  const sceneId = useMemo(() => boardViewId(subject), [subject]);
  const atoms = useMemo(() => createCanvasAtoms(sceneId), [sceneId]);
  const createProjection = useCallback(
    (options: FreehandProjectionOptions) => createComputeProjection({ ...options, controller }),
    [controller],
  );
  // Shared with the canvas, so its edits through this projection undo there.
  const history = useCanvasHistory({ registry, atoms, store });
  const projection = useViewProjection({ store, atoms, createProjection, history });

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
    <ComputeContext.Provider value={{ controller, resize }}>
      <Root>
        <Canvas.Root
          store={store}
          root={sceneId}
          atoms={atoms}
          nodes={computeNodeRegistry}
          projection={projection}
          history={history}
        >
          <Canvas.Viewport overlay={<Bullets controller={controller} projection={projection} />} />
          <Canvas.Navigation />
          <Canvas.Actions />
          <Canvas.Debug />
          <Canvas.Tools />
        </Canvas.Root>
      </Root>
    </ComputeContext.Provider>
  );
};

const Container = (props: Layout.FlexProps) => (
  <Layout.Flex {...props} classNames='aspect-square w-full max-h-full min-h-0' />
);

const useGraphController = (canvas: CanvasBoard.CanvasBoard) => {
  const db = Obj.getDatabase(canvas);
  const processManagerRuntime = Hooks.useCapability(Capabilities.ProcessManagerRuntime);
  const operationInvoker = Hooks.useOperationInvoker();
  const operationHandlers = Hooks.useCapability(Capabilities.OperationHandlers);
  // Subscribed so the article renders once the reference loads; the controller keys on the graph object, not its
  // snapshot, since a new controller per edit would lose every switch's value and rerun the whole graph.
  useObject(canvas.computeGraph);
  const graph = canvas.computeGraph?.target;
  const controller = useMemo(() => {
    if (!graph || !db) {
      return null;
    }
    const spaceId = db.spaceId;
    const model = new ComputeGraphModel(graph);
    // No layer spec provides `Operation.Service` or `OperationRegistry.Service` to a space (a process gets its own),
    // so the app's invoker stands in for the one and the other is built over the space's database and the app's
    // handlers, the same set the invoker resolves against.
    const spaceLayer = Layer.mergeAll(
      ServiceResolver.provide(
        { space: spaceId },
        AiService.AiService,
        Database.Service,
        Credential.CredentialsService,
        Registry.Service,
      ),
      OperationRegistry.layer.pipe(
        Layer.provide(
          Layer.merge(
            ServiceResolver.provide({ space: spaceId }, Database.Service),
            OperationHandlerSet.provide(operationHandlers),
          ),
        ),
      ),
      Layer.succeed(Operation.Service, operationInvoker),
    );
    const computeGraphRuntime = {
      // A service the space cannot resolve is a wiring defect, not a failure the graph can handle.
      runPromiseExit: <A, E>(effect: Effect.Effect<A, E, ComputeServices>): Promise<Exit.Exit<A, E>> =>
        processManagerRuntime.runPromiseExit(effect.pipe(Effect.provide(Layer.orDie(spaceLayer)))),
    };
    const controller = new ComputeGraphController(computeGraphRuntime, model);
    return controller;
  }, [graph, db, processManagerRuntime, operationInvoker, operationHandlers]);

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
