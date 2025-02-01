//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities, createEdgeServices } from '@dxos/artifact-testing';
import { type UnsubscribeCallback } from '@dxos/async';
import { type ComputeGraphModel, ComputeNode, DefaultInput, DefaultOutput } from '@dxos/conductor';
import { S, toEffectSchema } from '@dxos/echo-schema';
import { withClientProvider } from '@dxos/react-client/testing';
import { Select, Toolbar } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import {
  type Anchor,
  Editor,
  type EditorController,
  type EditorRootProps,
  ShapeLayout,
  ShapeRegistry,
} from '@dxos/react-ui-canvas-editor';
import { Container, useSelection } from '@dxos/react-ui-canvas-editor/testing';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { type ComputeGraphController } from './graph';
import { ComputeContext, useGraphMonitor } from './hooks';
import { computeShapes } from './registry';
import { createFunctionAnchors, type ComputeShape } from './shapes';
import {
  createControlCircuit,
  createGPTRealtimeCircuit,
  createLogicCircuit,
  createComputeGraphController,
  createBasicCircuit,
  createGptCircuit,
  createAudioCircuit,
  createTransformCircuit,
  createTemplateCircuit,
  createArtifactCircuit,
} from './testing';

const FormSchema = S.omit<any, any, ['subgraph']>('subgraph')(ComputeNode);

const sidebarTypes: NonNullable<RenderProps['sidebar']>[] = ['canvas', 'compute', 'controller', 'selected'] as const;

// TODO(burdon): Move to async/context?
const combine = (...cbs: UnsubscribeCallback[]) => {
  return () => {
    for (const cb of cbs) {
      cb();
    }
  };
};

// TODO(burdon): Customize layout. Specialize ComputeShapeDef and registry.
export class ComputeShapeLayout extends ShapeLayout {
  constructor(
    private _controller: ComputeGraphController,
    registry: ShapeRegistry,
  ) {
    super(registry);
  }

  // TODO(burdon): Doesn't update.
  override getAnchors(shape: ComputeShape): Record<string, Anchor> {
    const shapeDef = this._registry.getShapeDef(shape.type);
    let anchors = shapeDef?.getAnchors?.(shape) ?? {};
    if (shape.node) {
      const node = this._controller.graph.getNode(shape.node);
      if (node.inputSchema || node.outputSchema) {
        // TODO(burdon): Requires that component defined input and output types.
        const inputSchema = node.inputSchema ? toEffectSchema(node.inputSchema) : DefaultInput;
        const outputSchema = node.outputSchema ? toEffectSchema(node.outputSchema) : DefaultOutput;
        anchors = createFunctionAnchors(shape, inputSchema, outputSchema);
      }
    }

    return anchors;
  }
}

type RenderProps = EditorRootProps<ComputeShape> &
  PropsWithChildren<{
    init?: boolean;
    sidebar?: 'canvas' | 'compute' | 'controller' | 'selected';
    computeGraph?: ComputeGraphModel;
    controller?: ComputeGraphController;
  }>;

const Render = ({
  id = 'test',
  children,
  graph,
  controller,
  init,
  sidebar: _sidebar,
  registry,
  ...props
}: RenderProps) => {
  const [, forceUpdate] = useState({});

  const editorRef = useRef<EditorController>(null);

  // Selection.
  const [selection, selected] = useSelection(graph);

  const getComputeNode = (id?: string): ComputeNode | undefined => {
    if (id) {
      const node = graph?.getNode(id) as ComputeShape;
      if (node?.node) {
        return controller?.graph.getNode(node.node);
      }
    }
  };

  // Sidebar.
  const [sidebar, setSidebar] = useState(_sidebar);
  const json = useMemo(() => {
    switch (sidebar) {
      case 'canvas':
        return { graph };
      case 'compute':
        return { graph: controller?.graph };
      case 'controller':
        return { state: controller?.state };
      case 'selected':
        return { shape: selected, compute: getComputeNode(selected?.id) };
    }
  }, [graph, controller, sidebar, selected]);

  // Controller.
  useEffect(() => {
    if (!controller || !graph) {
      return;
    }

    void controller.open();
    const off = combine(
      controller.update.on(() => {
        void editorRef.current?.update();
        forceUpdate({});
      }),

      // TODO(burdon): Every node is called on every update.
      controller.output.on(({ nodeId, property, value }) => {
        if (value.type === 'not-executed') {
          // If the node didn't execute, don't trigger.
          return;
        }

        const edge = graph.edges.find((edge) => {
          const source = graph.getNode(edge.source);
          return (source as ComputeShape).node === nodeId && edge.output === property;
        });

        if (edge) {
          void editorRef.current?.action?.({ type: 'trigger', edges: [edge] });
        }
      }),
    );

    return () => {
      void controller.close();
      off();
    };
  }, [graph, controller]);

  // Sync monitor.
  const graphMonitor = useGraphMonitor(controller?.graph);

  // Layout.
  const layout = useMemo(
    () => (controller && registry ? new ComputeShapeLayout(controller, registry) : undefined),
    [controller, registry],
  );

  if (!controller) {
    return <div />;
  }

  return (
    <div className='grid grid-cols-[1fr,360px] w-full h-full'>
      <ComputeContext.Provider value={{ controller }}>
        <Container id={id} classNames={['flex grow overflow-hidden', !sidebar && 'col-span-2']}>
          <Editor.Root<ComputeShape>
            ref={editorRef}
            id={id}
            graph={graph}
            graphMonitor={graphMonitor}
            layout={layout}
            registry={registry}
            selection={selection}
            autoZoom
            {...props}
          >
            <Editor.Canvas>{children}</Editor.Canvas>
            <Editor.UI />
          </Editor.Root>
        </Container>
      </ComputeContext.Provider>

      {sidebar && (
        <Container id='sidebar' classNames='flex flex-col h-full overflow-hidden'>
          <Toolbar.Root classNames='p-1'>
            <Select.Root value={sidebar} onValueChange={(value) => setSidebar(value as RenderProps['sidebar'])}>
              <Select.TriggerButton classNames='is-full'>{sidebar}</Select.TriggerButton>
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {sidebarTypes.map((type) => (
                      <Select.Item key={type} value={type}>
                        {type}
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Toolbar.Root>

          <div className='flex flex-col h-full overflow-hidden divide-y divider-separator'>
            {sidebar === 'selected' && selected && (
              <div>Form</div>
              // <Form<ComputeNode> schema={FormSchema} values={getComputeNode(selected.id) ?? {}} Custom={{}} />
            )}

            <JsonFilter data={json} />
          </div>
        </Container>
      )}
    </div>
  );
};

const meta: Meta<RenderProps> = {
  title: 'ui/react-ui-canvas-compute/compute',
  component: Editor.Root,
  render: Render,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    withTheme,
    withAttention,
    withLayout({ fullscreen: true, tooltips: true }),
    withPluginManager({ capabilities }),
  ],
};

export default meta;

type Story = StoryObj<RenderProps>;

export const Default: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'selected',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(),
  },
};

export const Beacon: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'selected',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createBasicCircuit()),
  },
};

export const Transform: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'selected',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createTransformCircuit()),
  },
};

export const Logic: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'compute',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createLogicCircuit()),
  },
};

export const Control: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'compute',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createControlCircuit()),
  },
};

// export const Ollama: Story = {
//   args: {
//     // debug: true,
//     showGrid: false,
//     snapToGrid: false,
//     registry: new ShapeRegistry(computeShapes),
//     ...createComputeGraphController(createTest3(), createEdgeServices()),
//   },
// };

export const Template: Story = {
  args: {
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'controller',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createTemplateCircuit(), createEdgeServices()),
  },
};

export const GPT: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'json',
    sidebar: 'controller',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createGptCircuit({ history: true }), createEdgeServices()),
  },
};

export const Plugins: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'json',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createGptCircuit({ history: true, image: true, artifact: true }),
      createEdgeServices(),
    ),
  },
};

export const Artifact: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'json',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createArtifactCircuit(), createEdgeServices()),
  },
};

export const Audio: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'controller',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createAudioCircuit(), createEdgeServices()),
  },
};

export const Voice: Story = {
  args: {
    showGrid: false,
    snapToGrid: false,
    sidebar: 'controller',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createGPTRealtimeCircuit(), createEdgeServices()),
  },
};
