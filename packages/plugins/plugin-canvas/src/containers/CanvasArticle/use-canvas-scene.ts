//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Database, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import {
  type GeneratorSource,
  type NodeRegistry,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  kindNodeDef,
  kindRegistry,
} from '@dxos/react-ui-canvas';
import { type KindRegistry, type Node } from '@dxos/scene';

import { CanvasViewNode, ImageNode } from '#model';
import { CanvasCapabilities, Generator } from '#types';

import { CanvasViewNodeView, CanvasViewToolbar } from './CanvasViewNodeView.tsx';
import { ImageNodeView } from './ImageNodeView.tsx';

/**
 * The built-in node types and whatever other plugins contribute (a contribution may replace a built-in).
 * The canvas's frame shows an object (`object`) as that object's surface.
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
          ...Object.fromEntries(contributed.map(({ type, spec }) => [type, kindNodeDef(type, spec)])),
        },
        defaultNodePrototypes,
      ),
    [contributed, hostOpen],
  );
};

/** The element kinds other plugins contribute, whose elements keep their own fields at their top (decision 13). */
export const useCanvasKinds = (): KindRegistry => {
  const contributed = Hooks.useCapabilities(CanvasCapabilities.NodeType);
  return useMemo(
    () => kindRegistry(Object.fromEntries(contributed.map(({ type, spec }) => [type, spec]))),
    [contributed],
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
