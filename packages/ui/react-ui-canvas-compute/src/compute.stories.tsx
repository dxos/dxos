//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { type ComputeGraphModel, type ComputeNode, type GraphDiagnostic } from '@dxos/conductor';
import { ServiceContainer } from '@dxos/functions-runtime';
import { withClientProvider } from '@dxos/react-client/testing';
import { Select, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Editor, type EditorController, type EditorRootProps, ShapeRegistry } from '@dxos/react-ui-canvas-editor';
import { Container, useSelection } from '@dxos/react-ui-canvas-editor/testing';
import { Form } from '@dxos/react-ui-form';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';

import { DiagnosticOverlay } from './components';
import { ComputeShapeLayout } from './compute-layout';
import { type ComputeGraphController } from './graph';
import { ComputeContext, useComputeGraphController, useGraphMonitor } from './hooks';
import { computeShapes } from './registry';
import { type ComputeShape } from './shapes';
import {
  createArtifactCircuit,
  createAudioCircuit,
  createBasicCircuit,
  createComputeGraphController,
  createControlCircuit,
  createEmptyCircuit,
  createGPTRealtimeCircuit,
  createGptCircuit,
  createLogicCircuit,
  createTemplateCircuit,
  createTransformCircuit,
} from './testing';

// TODO(burdon): Replace ServiceContainer.

const sidebarTypes: NonNullable<RenderProps['sidebar']>[] = ['canvas', 'compute', 'controller', 'selected'] as const;

const hiddenArg = { table: { disable: true } };

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
  sidebar: sidebarProp,
  registry,
  showGrid = true,
  snapToGrid = true,
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
  const [sidebar, setSidebar] = useState<RenderProps['sidebar']>(sidebarProp);
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
    <div className='grid grid-cols-[1fr,360px] is-full bs-full'>
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
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            {...props}
          >
            <Editor.Canvas>{children}</Editor.Canvas>
            <Editor.UI showTools />
          </Editor.Root>
          <DiagnosticOverlay diagnostics={diagnostics} />
        </Container>
      </ComputeContext.Provider>

      {sidebar && (
        <Container id='sidebar' classNames='flex flex-col bs-full overflow-hidden'>
          <Toolbar.Root>
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
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Toolbar.Root>

          <div className='flex flex-col bs-full overflow-hidden divide-y divider-separator'>
            {/* TODO(burdon): Provide schema. */}
            {sidebar === 'selected' && selected && (
              <Form.Root<ComputeNode> values={getComputeNode(selected.id) ?? {}}>
                <Form.Viewport>
                  <Form.Content>
                    <Form.FieldSet />
                    <Form.Actions />
                  </Form.Content>
                </Form.Viewport>
              </Form.Root>
            )}
            <JsonFilter data={json} />
          </div>
        </Container>
      )}
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-compute/compute',
  component: Editor.Root as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withAttention,
    withClientProvider({ createIdentity: true, createSpace: true }),
    withPluginManager({ capabilities }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    controller: hiddenArg,
    graph: hiddenArg,
    registry: hiddenArg,
    sidebar: {
      control: 'select',
      options: [...sidebarTypes, null],
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createEmptyCircuit(), new ServiceContainer()),
  },
};

export const Beacon: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createBasicCircuit(), new ServiceContainer()),
  },
};

export const Transform: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createTransformCircuit(), new ServiceContainer()),
  },
};

export const Logic: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createLogicCircuit(), new ServiceContainer()),
  },
};

export const Control: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createControlCircuit(), new ServiceContainer()),
  },
};

export const Template: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createTemplateCircuit(),
      new ServiceContainer().setServices({
        // ai: AiService.make(new Edge AiServiceClient({ endpoint: localServiceEndpoints.ai })),
      }),
    ),
  },
};

export const GPT: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createGptCircuit({ history: true }),
      new ServiceContainer().setServices({
        // ai: AiService.make(new Edge AiServiceClient({ endpoint: localServiceEndpoints.ai })),
      }),
    ),
  },
};

export const Plugins: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createGptCircuit({ history: true, image: true, artifact: true }),
      new ServiceContainer().setServices({
        // ai: AiService.make(new Edge AiServiceClient({ endpoint: SERVICES_CONFIG.local.ai.server })),
      }),
    ),
  },
};

export const Artifact: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createArtifactCircuit(),
      new ServiceContainer().setServices({
        // ai: AiService.make(new Edge AiServiceClient({ endpoint: SERVICES_CONFIG.local.ai.server })),
      }),
    ),
  },
};

export const ImageGen: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createGptCircuit({ image: true, artifact: true }),
      new ServiceContainer().setServices({
        // ai: AiService.make(createTestAiServiceClient()),
      }),
    ),
  },
};

export const Audio: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createAudioCircuit(),
      new ServiceContainer().setServices({
        // ai: AiService.make(createTestAiServiceClient()),
      }),
    ),
  },
};

export const Voice: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createGPTRealtimeCircuit(),
      new ServiceContainer().setServices({
        // ai: AiService.make(createTestAiServiceClient()),
      }),
    ),
  },
};
