//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { type ComputeGraphModel, type ComputeNode, type GraphDiagnostic } from '@dxos/conductor';
import { withClientProvider } from '@dxos/react-client/testing';
import { Select, Toolbar } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Editor, type EditorController, type EditorRootProps, ShapeRegistry } from '@dxos/react-ui-canvas-editor';
import { Container, useSelection } from '@dxos/react-ui-canvas-editor/testing';
import { Form } from '@dxos/react-ui-form';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { DiagnosticOverlay } from './components/index.ts';
import { ComputeShapeLayout } from './compute-layout.ts';
import { type ComputeGraphController, createComputeGraphController } from './graph/index.ts';
import { ComputeContext, useComputeGraphController, useGraphMonitor } from './hooks/index.ts';
import { computeShapes } from './registry.ts';
import { type ComputeShape } from './shapes/index.ts';
import {
  createArtifactCircuit,
  createAudioCircuit,
  createBasicCircuit,
  createControlCircuit,
  createEmptyCircuit,
  createGptCircuit,
  createGPTRealtimeCircuit,
  createLogicCircuit,
  createTemplateCircuit,
  createTransformCircuit,
} from './testing/index.ts';
import { createStoryRuntime } from './testing/services.ts';

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
    <div className='grid grid-cols-[1fr_360px] dx-fill'>
      <ComputeContext.Provider value={{ controller, registry }}>
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
        <Container id='sidebar' classNames='flex flex-col h-full overflow-hidden'>
          <Toolbar.Root>
            <Select.Root value={sidebar} onValueChange={(value) => setSidebar(value as RenderProps['sidebar'])}>
              <Select.TriggerButton classNames='w-full'>{sidebar}</Select.TriggerButton>
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
            {/* TODO(burdon): Provide schema. */}
            {sidebar === 'selected' && selected && (
              <Form.Root<ComputeNode> values={getComputeNode(selected.id) ?? {}}>
                <Form.Viewport>
                  <Form.Content>
                    <Form.Fields />
                    <Form.Actions />
                  </Form.Content>
                </Form.Viewport>
              </Form.Root>
            )}
            <Syntax.Root data={json}>
              <Syntax.Content>
                <Syntax.Filter />
                <Syntax.Viewport>
                  <Syntax.Code />
                </Syntax.Viewport>
              </Syntax.Content>
            </Syntax.Root>
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
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withAttention(),
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
    ...createComputeGraphController(createEmptyCircuit(), createStoryRuntime()),
  },
};

export const Beacon: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createBasicCircuit(), createStoryRuntime()),
  },
};

export const Transform: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createTransformCircuit(), createStoryRuntime()),
  },
};

export const Logic: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createLogicCircuit(), createStoryRuntime()),
  },
};

export const Control: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createControlCircuit(), createStoryRuntime()),
  },
};

export const Template: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createTemplateCircuit(), createStoryRuntime()),
  },
};

export const GPT: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createGptCircuit({ history: true }), createStoryRuntime()),
  },
};

export const Plugins: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(
      createGptCircuit({ history: true, image: true, artifact: true }),
      createStoryRuntime(),
    ),
  },
};

export const Artifact: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createArtifactCircuit(), createStoryRuntime()),
  },
};

export const ImageGen: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createGptCircuit({ image: true, artifact: true }), createStoryRuntime()),
  },
};

export const Audio: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createAudioCircuit(), createStoryRuntime()),
  },
};

export const Voice: Story = {
  args: {
    registry: new ShapeRegistry(computeShapes),
    ...createComputeGraphController(createGPTRealtimeCircuit(), createStoryRuntime()),
  },
};
