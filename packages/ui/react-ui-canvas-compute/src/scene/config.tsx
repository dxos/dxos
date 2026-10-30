//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type ComponentType, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { DefaultInput, DefaultOutput } from '@dxos/conductor';
import * as JsonSchema from '@dxos/echo/JsonSchema';
import {
  type Camera,
  type DimensionConfig,
  type InspectorSectionDef,
  type ViewportProps,
  useSceneEditor,
} from '@dxos/react-ui-canvas';
import { createConfig2D } from '@dxos/react-ui-scene';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { type LayoutIntent, type Port, type Scene, findLayout } from '@dxos/scene';

import { type ComputeGraphController } from '../graph/index.ts';
import { computeKinds, computeNodeRegistry } from '../registry.ts';
import { createFunctionPorts } from '../shapes/index.ts';
import { type BoardElement } from './echo-store.ts';
import { fromViewportIntent, toViewportLayout } from './viewport-form.ts';

/** Re-renders the caller on every controller update, returning a count that changes with each. */
const useControllerVersion = (controller: ComputeGraphController): number => {
  const [version, bump] = useReducer((count: number) => count + 1, 0);
  useEffect(() => controller.update.on(() => bump()), [controller]);
  return version;
};

/** The compute node's runtime ports, one per property of its input and output schemas, where it declares them. */
const runtimePorts = (controller: ComputeGraphController, element: BoardElement): readonly Port[] | undefined => {
  const id = typeof element.node === 'string' ? element.node : undefined;
  // `findNode`: a delete removes the compute node before the shape, and a peer's may land first.
  const computeNode = id === undefined ? undefined : controller.graph.findNode(id);
  if ((!computeNode?.inputSchema && !computeNode?.outputSchema) || !element.size) {
    return undefined;
  }
  return createFunctionPorts(
    element.size,
    computeNode.inputSchema ? JsonSchema.toEffectSchema(computeNode.inputSchema) : DefaultInput,
    computeNode.outputSchema ? JsonSchema.toEffectSchema(computeNode.outputSchema) : DefaultOutput,
  );
};

/**
 * The 2D viewport over the board's compute kinds: each compute element drawn with its kind's fields and runtime ports
 * where the engine reads them, and every intent the viewport writes lifted back before the editor records it.
 */
const createComputeViewport = (
  Base: ComponentType<ViewportProps<Camera>>,
  controller: ComputeGraphController,
): ComponentType<ViewportProps<Camera>> => {
  const ComputeViewport = (props: ViewportProps<Camera>) => {
    const { document, onIntent } = props;
    const version = useControllerVersion(controller);
    const ports = useMemo(() => {
      const map = new Map<string, readonly Port[]>();
      for (const layout of document.layouts) {
        for (const element of layout.dim === '2d' ? Object.values(layout.elements) : []) {
          const found = runtimePorts(controller, element);
          found && map.set(element.id, found);
        }
      }
      return map;
    }, [document, version]);
    // Keyed by value, so a controller update that changes no ports leaves the drawn document as it is.
    const portsKey = JSON.stringify([...ports]);
    const drawn = useMemo<Scene.SceneDocument>(
      () => ({
        ...document,
        layouts: document.layouts.map((layout) =>
          layout.dim === '2d' ? toViewportLayout(layout, computeKinds, (element) => ports.get(element.id)) : layout,
        ),
      }),
      [document, portsKey],
    );
    const latest = useRef(document);
    latest.current = document;
    const handleIntent = useCallback(
      (layout: string, intent: LayoutIntent) => {
        const record = findLayout(latest.current, layout);
        onIntent(layout, record?.dim === '2d' ? fromViewportIntent(intent, record, computeKinds) : intent);
      },
      [onIntent],
    );
    return <Base {...props} document={drawn} onIntent={handleIntent} />;
  };
  ComputeViewport.displayName = 'ComputeViewport';
  return ComputeViewport;
};

export const COMPUTE_INSPECTOR: InspectorSectionDef = {
  id: 'compute',
  title: 'Compute',
  icon: 'ph--function--regular',
  order: 60,
};

/** The selected shape's compute node: its type, and the values on its inputs and outputs as the runtime last saw them. */
const ComputeSection = ({ controller }: { controller: ComputeGraphController }) => {
  const { document, layout, store } = useSceneEditor('ComputeSection');
  const selection = useAtomValue(store.atoms.selection);
  useControllerVersion(controller);
  const record = layout === undefined ? undefined : findLayout(document, layout);
  const element = selection.length === 1 && record?.dim === '2d' ? record.elements[selection[0]] : undefined;
  const id = typeof element?.node === 'string' ? element.node : undefined;
  const node = id === undefined ? undefined : controller.graph.findNode(id);
  const data = node
    ? { type: node.type, id: node.id, inputs: controller.getInputs(node.id), outputs: controller.getOutputs(node.id) }
    : { diagnostics: controller.diagnostics };
  return (
    <Syntax.Root data={data}>
      <Syntax.Content>
        <Syntax.Viewport>
          <Syntax.Code />
        </Syntax.Viewport>
      </Syntax.Content>
    </Syntax.Root>
  );
};

export type ComputeConfigOptions = {
  controller: ComputeGraphController;
};

/**
 * The compute board's editor config: the shared 2D config over the compute node types (its rail is their palette), a
 * viewport that draws the board's compute kinds, and a Compute inspector section.
 */
export const createComputeConfig = ({ controller }: ComputeConfigOptions): DimensionConfig<Camera> => {
  const base = createConfig2D({ nodes: computeNodeRegistry });
  return {
    ...base,
    viewport: createComputeViewport(base.viewport, controller),
    sections: [{ section: COMPUTE_INSPECTOR, render: () => <ComputeSection controller={controller} /> }],
  };
};
