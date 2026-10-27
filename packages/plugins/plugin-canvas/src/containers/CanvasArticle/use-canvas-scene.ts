//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Database, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import {
  type GeneratorSource,
  type Node,
  type NodeRegistry,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  useRegistry,
} from '@dxos/react-ui-canvas/scene';

import { type BoundCanvasStore, CanvasViewNode, ImageNode, bindCanvasStore } from '#model';
import { CanvasCapabilities, Generator } from '#types';

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
