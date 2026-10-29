//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Database, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import {
  type GeneratorSource,
  type Node,
  type NodeRegistry,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  useRegistry,
} from '@dxos/react-ui-canvas/scene';
import { Scene } from '@dxos/scene';

import {
  type BoundCanvasStore,
  type BoundLayoutStore,
  CanvasViewNode,
  ImageNode,
  bindCanvasStore,
  bindLayoutStore,
  migrateSceneDrawing,
  openScene,
} from '#model';
import { Canvas, CanvasCapabilities, Generator } from '#types';

import { CanvasViewNodeView, CanvasViewToolbar } from './CanvasViewNodeView.tsx';
import { ImageNodeView } from './ImageNodeView.tsx';

/** The canvas's scene store, bound for the canvas's lifetime in this view; a new canvas rebinds. */
export const useBoundCanvasStore = (canvas: Drawing.Canvas): BoundCanvasStore | undefined => {
  const registry = useRegistry();
  const [bound, setBound] = useState<BoundCanvasStore>();
  useEffect(() => {
    const next = bindCanvasStore(registry, canvas);
    setBound(next);
    return () => next.dispose();
  }, [registry, canvas]);
  return bound;
};

/** The canvas's open scene's layout store, bound for the canvas's lifetime in this view; a new canvas rebinds. */
export const useBoundLayoutStore = (canvas: Canvas.Canvas): BoundLayoutStore | undefined => {
  const registry = useRegistry();
  const [bound, setBound] = useState<BoundLayoutStore>();
  const scene = openScene(canvas);
  useEffect(() => {
    if (!Obj.instanceOf(Scene.Scene2D, scene)) {
      return;
    }
    const next = bindLayoutStore(registry, scene, { canvas });
    setBound(next);
    return () => next.dispose();
  }, [registry, canvas, scene]);
  return bound;
};

/**
 * A legacy scene drawing's `Canvas`, once `migrate` has moved it onto one (the article opening it for writing); until
 * then, and for a drawing that does not migrate (a newer plugin's), undefined.
 */
export const useMigratedCanvas = (
  drawing: Obj.Snapshot<Drawing.Drawing> | Drawing.Drawing,
  canvas: Drawing.Canvas,
  migrate: boolean,
): Canvas.Canvas | undefined => {
  const [migrated, setMigrated] = useState<Canvas.Canvas>();
  const db = Obj.getDatabase(canvas);
  useEffect(() => {
    if (!migrate || !db) {
      return;
    }
    let cancelled = false;
    // The surface may hand a snapshot, so the live drawing is read from the database.
    void EffectEx.runPromise(
      Effect.gen(function* () {
        const [live] = yield* Database.query(Filter.id(drawing.id)).run;
        if (!Obj.instanceOf(Drawing.Drawing, live)) {
          return undefined;
        }
        yield* migrateSceneDrawing(live);
        const target = live.canvas.target;
        return Canvas.isCanvas(target) ? target : undefined;
      }).pipe(Effect.provide(Database.layer(db))),
    )
      .then((next) => !cancelled && setMigrated(next))
      // A drawing that fails to migrate stays on its legacy canvas, which the legacy view still shows.
      .catch(() => !cancelled && setMigrated(undefined));
    return () => {
      cancelled = true;
    };
  }, [migrate, db, drawing.id, canvas]);
  return migrated;
};

/**
 * The built-in node types and whatever other plugins contribute (a contribution may replace a built-in).
 * The canvas's frame may show an object (`object`): a canvas drawing the store binds alongside, else a surface.
 */
export const useCanvasNodes = (hostOpen?: (node: Node) => (() => void) | undefined): NodeRegistry => {
  const contributed = Hooks.useCapabilities(CanvasCapabilities.NodeType);
  return useMemo(
    () =>
      createNodeRegistry(
        {
          ...defaultNodeTypes,
          view: {
            ...defaultNodeTypes.view,
            schema: CanvasViewNode,
            component: CanvasViewNodeView,
            toolbar: CanvasViewToolbar,
            hostOpen,
          },
          image: {
            name: 'Image',
            icon: 'ph--image--regular',
            key: 'I',
            schema: ImageNode,
            component: ImageNodeView,
            create: (props) => ({ type: 'image', ...props }),
            defaultSize: { width: 4, height: 3 },
            resizable: true,
            minSize: { width: 32, height: 32 },
            // The picture is the shape: no fill or border unless the style asks for them.
            bare: true,
          },
          ...Object.fromEntries(contributed.map(({ type, spec }) => [type, spec])),
        },
        defaultNodePrototypes,
      ),
    [contributed, hostOpen],
  );
};

/** The space's generators by the reference a generator node stores, as the view loads them; a revision updates it. */
export const useCanvasGenerators = (db: Database.Database | undefined): Readonly<Record<string, GeneratorSource>> => {
  const generators = useQuery(db, Filter.type(Generator.Generator));
  const revision = generators.map((generator) => `${generator.id}@${generator.version}`).join(' ');
  return useMemo(
    () =>
      Object.fromEntries(
        generators.map((generator) => [Generator.referenceOf(generator), Generator.toSource(generator)]),
      ),
    // Keyed on the revisions, which a source edit always bumps, rather than on the result's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
};

/** The generator worker: agent-written code runs there, away from the page. */
export const createGeneratorWorker = (): Worker =>
  new Worker(new URL('@dxos/react-ui-canvas/generator-worker', import.meta.url), { type: 'module' });
