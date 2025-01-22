//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { AIServiceClientImpl } from '@dxos/assistant';
import { type UnsubscribeCallback } from '@dxos/async';
import { type ComputeGraphModel, ComputeNode, EdgeClientService, EdgeGpt } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { withClientProvider } from '@dxos/react-client/testing';
import { Select, Toolbar } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { type StateMachine, type StateMachineContext } from './graph';
import { ComputeContext, useGraphMonitor } from './hooks';
import { computeShapes } from './registry';
import { type ComputeShape } from './shapes';
import {
  createGPTRealtime,
  createMachine,
  createLogicCircuit,
  createTest3,
  createTest4,
  createControlCircuit,
  createTest0,
  createServices,
} from './testing';
import { Editor, type EditorController, type EditorRootProps } from '../components';
import { JsonFilter, ShapeRegistry } from '../components';
import { Container } from '../components/Container';
import { useSelection } from '../testing';
import { type Connection } from '../types';
import { createEphemeralEdgeIdentity, createStubEdgeIdentity, EdgeClient, EdgeHttpClient } from '@dxos/edge-client';

type RenderProps = EditorRootProps &
  PropsWithChildren<{
    init?: boolean;
    sidebar?: 'canvas' | 'compute' | 'state-machine' | 'selected';
    computeGraph?: ComputeGraphModel;
    machine?: StateMachine;
    model?: StateMachineContext['model'];
    gpt?: StateMachineContext['gpt'];
  }>;

const FormSchema = S.omit<any, any, ['subgraph']>('subgraph')(ComputeNode);

const sidebarTypes: NonNullable<RenderProps['sidebar']>[] = ['canvas', 'compute', 'state-machine', 'selected'] as const;

// TODO(burdon): Move to async/context?
const combine = (...cbs: UnsubscribeCallback[]) => {
  return () => {
    for (const cb of cbs) {
      cb();
    }
  };
};

const Render = ({
  id = 'test',
  children,
  graph,
  machine,
  model,
  gpt,
  init,
  sidebar: _sidebar,
  ...props
}: RenderProps) => {
  const [, forceUpdate] = useState({});

  const editorRef = useRef<EditorController>(null);

  // Selection.
  const [selection, selected] = useSelection(graph);

  const getComputeNode = (id?: string): ComputeNode | undefined => {
    if (id) {
      const node = graph?.getNode(id)?.data as ComputeShape;
      if (node?.node) {
        return machine?.graph.getNode(node.node);
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
        return { machine, model, gpt };
      case 'state-machine':
        return machine?.nodeStates;
      case 'selected':
        return { shape: selected, compute: getComputeNode(selected?.id) };
    }
  }, [graph, machine, sidebar, selected]);

  // State machine.
  useEffect(() => {
    if (!machine || !graph) {
      return;
    }

    void machine.open();
    const off = combine(
      machine.update.on(() => {
        void editorRef.current?.update();
        forceUpdate({});
      }),

      // TODO(burdon): Every node is called on every update.
      machine.output.on(({ nodeId, property, value }) => {
        if (value.type === 'not-executed') {
          // If the node didn't execute, don't trigger.
          return;
        }

        const edge = graph.edges.find((edge) => {
          const source = graph.getNode(edge.source);
          return (source.data as ComputeShape).node === nodeId && (edge.data as Connection).output === property;
        });

        if (edge) {
          void editorRef.current?.action?.({ type: 'trigger', edges: [edge] });
        }
      }),
    );

    return () => {
      void machine.close();
      off();
    };
  }, [graph, machine]);

  // Sync monitor.
  const graphMonitor = useGraphMonitor(machine?.graph);

  return (
    <div className='grid grid-cols-[1fr,360px] w-full h-full'>
      <ComputeContext.Provider value={{ stateMachine: machine! }}>
        <Container id={id} classNames={['flex grow overflow-hidden', !sidebar && 'col-span-2']}>
          <Editor.Root
            ref={editorRef}
            id={id}
            graph={graph}
            graphMonitor={graphMonitor}
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
              <Form<ComputeNode> schema={FormSchema} values={getComputeNode(selected.id) ?? {}} Custom={{}} />
            )}

            <JsonFilter data={json} />
          </div>
        </Container>
      )}
    </div>
  );
};

const meta: Meta<EditorRootProps> = {
  title: 'plugins/plugin-canvas/compute',
  component: Editor.Root,
  render: Render,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    withTheme,
    withAttention,
    withLayout({ fullscreen: true, tooltips: true }),
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
    ...createMachine(createTest0()),
  },
};

export const Logic: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'compute',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(createLogicCircuit()),
  },
};

export const Control: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'compute',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(createControlCircuit()),
  },
};

// export const Ollama: Story = {
//   args: {
//     // debug: true,
//     showGrid: false,
//     snapToGrid: false,
//     sidebar: 'state-machine',
//     registry: new ShapeRegistry(computeShapes),
//     ...createMachine(createTest3()),
//     // gpt: new OllamaGpt(ollamaClient),
//   },
// };

export const GPT: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'json',
    sidebar: 'state-machine',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(createTest3({ db: false, viewText: true, history: true }), createServices()),
  },
};

export const GPTImage: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'json',
    sidebar: 'state-machine',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(createTest3({ db: false, viewText: true, history: true, textToImage: true, artifact: true }), {
      gpt: new EdgeGpt(
        new AIServiceClientImpl({
          // endpoint: 'https://ai-service.dxos.workers.dev',
          endpoint: 'http://localhost:8787',
        }),
      ),
    }),
  },
};

export const GPTAudio: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'state-machine',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(createTest4(), {
      gpt: new EdgeGpt(
        new AIServiceClientImpl({
          // endpoint: 'https://ai-service.dxos.workers.dev',
          endpoint: 'http://localhost:8787',
        }),
      ),
    }),
  },
};

// export const GPTArtifact: Story = {
//   args: {
//     // debug: true,
//     showGrid: false,
//     snapToGrid: false,
//     sidebar: 'selected',
//     // sidebar: 'state-machine',
//     registry: new ShapeRegistry(computeShapes),
//     spec: [
//       { type: Testing.OrgType, count: 2 },
//       { type: Testing.ProjectType, count: 4 },
//       { type: Testing.ContactType, count: 8 },
//     ],
//     registerSchema: true,
//     ...createMachine(createTest3({ cot: true, artifact: true, history: true, db: true, textToImage: true })),
//     model: '@anthropic/claude-3-5-sonnet-20241022',
//     gpt: new EdgeGptExecutor(
//       new AIServiceClientImpl({
//         // endpoint: 'https://ai-service.dxos.workers.dev',
//         endpoint: 'http://localhost:8787',
//       }),
//     ),
//   },
// };

export const GPTRealtime: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'json',
    sidebar: 'state-machine',
    registry: new ShapeRegistry(computeShapes),
    // spec: [
    //   { type: Testing.OrgType, count: 2 },
    //   { type: Testing.ProjectType, count: 4 },
    //   { type: Testing.ContactType, count: 8 },
    // ],
    // registerSchema: true,
    ...createMachine(createGPTRealtime(), {
      gpt: new EdgeGpt(
        new AIServiceClientImpl({
          // endpoint: 'https://ai-service.dxos.workers.dev',
          endpoint: 'http://localhost:8787',
        }),
      ),
    }),
  },
};
