//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { EdgeAiServiceClient } from '@dxos/ai';
import { createTestAiServiceClient } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities, localServiceEndpoints } from '@dxos/artifact-testing';
import { type ComputeGraphModel, type ComputeNode, type GraphDiagnostic } from '@dxos/conductor';
import { AiService, ServiceContainer } from '@dxos/functions';
import { withClientProvider } from '@dxos/react-client/testing';
import { Select, Toolbar } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import {
  CanvasGraphModel,
  Editor,
  type EditorController,
  type EditorRootProps,
  ShapeRegistry,
} from '@dxos/react-ui-canvas-editor';
import { Container, useSelection } from '@dxos/react-ui-canvas-editor/testing';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { DiagnosticOverlay } from './components';
import { ComputeShapeLayout } from './compute-layout';
import { type ComputeGraphController } from './graph';
import { ComputeContext, useComputeGraphController, useGraphMonitor } from './hooks';
import { computeShapes } from './registry';
import { type ComputeShape } from './shapes';
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

// const FormSchema = Schema.omit<any, any, ['subgraph']>('subgraph')(ComputeNode);

const sidebarTypes: NonNullable<RenderProps['sidebar']>[] = ['canvas', 'compute', 'controller', 'selected'] as const;

type RenderProps = EditorRootProps<ComputeShape> &
  PropsWithChildren<{
    init?: boolean;
    sidebar?: 'canvas' | 'compute' | 'controller' | 'selected';
    computeGraph?: ComputeGraphModel;
    controller?: ComputeGraphController | null;
  }>;

const DefaultStory = ({
  id = 'test',
  children,
  graph,
  controller = null,
  init,
  sidebar: _sidebar,
  registry,
  ...props
}: RenderProps) => {
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
  useComputeGraphController({ controller, graph, editorRef });

  // Sync monitor.
  const graphMonitor = useGraphMonitor(controller?.graph);

  // Layout.
  const layout = useMemo(
    () => (controller && registry ? new ComputeShapeLayout(controller, registry) : undefined),
    [controller, registry],
  );

  const [diagnostics, setDiagnostics] = useState<GraphDiagnostic[]>([]);
  useEffect(() => {
    if (controller) {
      void controller.checkGraph().then(() => {
        setDiagnostics(controller.diagnostics);
      });
    }
  }, []);

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
            <Editor.UI showTools />
          </Editor.Root>
          <DiagnosticOverlay diagnostics={diagnostics} />
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
  render: DefaultStory,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    withTheme,
    withAttention,
    withLayout({ fullscreen: true }),
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
    ...createComputeGraphController(CanvasGraphModel.create<ComputeShape>(), new ServiceContainer()),
  },
};

export const Beacon: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'selected',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createBasicCircuit(), new ServiceContainer()),
  },
};

export const Transform: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'selected',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createTransformCircuit(), new ServiceContainer()),
  },
};

export const Logic: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'compute',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createLogicCircuit(), new ServiceContainer()),
  },
};

export const Control: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'compute',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createControlCircuit(), new ServiceContainer()),
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
    ...createComputeGraphController(
      createTemplateCircuit(),
      new ServiceContainer().setServices({
        ai: AiService.make(new EdgeAiServiceClient({ endpoint: localServiceEndpoints.ai })),
      }),
    ),
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
    ...createComputeGraphController(
      createGptCircuit({ history: true }),
      new ServiceContainer().setServices({
        ai: AiService.make(new EdgeAiServiceClient({ endpoint: localServiceEndpoints.ai })),
      }),
    ),
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
      new ServiceContainer().setServices({
        ai: AiService.make(new EdgeAiServiceClient({ endpoint: localServiceEndpoints.ai })),
      }),
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
    ...createComputeGraphController(
      createArtifactCircuit(),
      new ServiceContainer().setServices({
        ai: AiService.make(new EdgeAiServiceClient({ endpoint: localServiceEndpoints.ai })),
      }),
    ),
  },
};

export const ImageGen: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'json',
    sidebar: 'controller',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createGptCircuit({ image: true, artifact: true }),
      new ServiceContainer().setServices({
        ai: AiService.make(createTestAiServiceClient()),
      }),
    ),
  },
};

export const Audio: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'controller',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createAudioCircuit(),
      new ServiceContainer().setServices({
        ai: AiService.make(createTestAiServiceClient()),
      }),
    ),
  },
};

export const Voice: Story = {
  args: {
    showGrid: false,
    snapToGrid: false,
    sidebar: 'controller',
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createGPTRealtimeCircuit(),
      new ServiceContainer().setServices({
        ai: AiService.make(createTestAiServiceClient()),
      }),
    ),
  },
};
