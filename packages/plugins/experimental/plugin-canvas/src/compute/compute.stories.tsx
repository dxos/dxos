//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { type UnsubscribeCallback } from '@dxos/async';
import type { ComputeEdge, ComputeNode } from '@dxos/conductor';
import { type GraphEdge, type GraphModel, type GraphNode } from '@dxos/graph';
import { withClientProvider } from '@dxos/react-client/testing';
import { Select } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { type StateMachine, type StateMachineContext } from './graph';
import { ComputeContext, useGraphMonitor } from './hooks';
import { computeShapes } from './registry';
import { type ComputeShape } from './shapes';
import { createMachine, createTest1 } from './testing';
import { Editor, type EditorController, type EditorRootProps } from '../components';
import { AttentionContainer, ShapeRegistry } from '../components';
import { useSelection } from '../testing';
import { type Connection } from '../types';

type RenderProps = EditorRootProps &
  PropsWithChildren<{
    init?: boolean;
    sidebar?: 'canvas' | 'compute' | 'state-machine' | 'selected';
    computeGraph?: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>;
    machine?: StateMachine;
    model?: StateMachineContext['model'];
    gpt?: StateMachineContext['gpt'];
  }>;

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
  const editorRef = useRef<EditorController>(null);
  const [sidebar, setSidebar] = useState(_sidebar);
  const json = useMemo(() => {
    switch (sidebar) {
      case 'canvas':
        return { graph };
      case 'compute':
        return { machine, model, gpt };
      case 'state-machine':
        return {
          graph: machine?.graph,
          user: machine?.userState,
          executed: machine?.executedState,
        };
      case 'selected':
        return { selected };
    }
  }, [sidebar]);

  // State machine.
  useEffect(() => {
    if (!machine || !graph) {
      return;
    }

    void machine.open();
    const off = combine(
      machine.update.on(() => {
        void editorRef.current?.update();
      }),

      // TODO(burdon): Every node is called on every update.
      machine.output.on(({ nodeId, property }) => {
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
  const graphMonitor = useGraphMonitor(machine);

  // Selection.
  const [selection, selected] = useSelection(graph);

  return (
    <div className='grid grid-cols-[1fr,360px] w-full h-full'>
      <ComputeContext.Provider value={{ stateMachine: machine! }}>
        <AttentionContainer id={id} classNames={['flex grow overflow-hidden', !sidebar && 'col-span-2']}>
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
        </AttentionContainer>
      </ComputeContext.Provider>

      {sidebar && (
        <AttentionContainer id='test' classNames='flex flex-col h-full overflow-hidden'>
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

          <div className='flex flex-col h-full overflow-hidden'>
            <SyntaxHighlighter language='json' classNames='text-xs'>
              {JSON.stringify(json, null, 2)}
            </SyntaxHighlighter>
          </div>
        </AttentionContainer>
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
    sidebar: 'state-machine',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(),
  },
};

export const Compute1: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'compute',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(createTest1()),
  },
};

// export const Compute2: Story = {
//   args: {
//     // debug: true,
//     showGrid: false,
//     snapToGrid: false,
//     sidebar: 'state-machine',
//     registry: new ShapeRegistry(computeShapes),
//     ...createMachine(createTest2()),
//   },
// };

// export const Ollama: Story = {
//   args: {
//     // debug: true,
//     showGrid: false,
//     snapToGrid: false,
//     sidebar: 'state-machine',
//     registry: new ShapeRegistry(computeShapes),
//     ...createMachine(createTest3()),
//     gpt: new OllamaGpt(ollamaClient),
//   },
// };

// export const GPT: Story = {
//   args: {
//     // debug: true,
//     showGrid: false,
//     snapToGrid: false,
//     // sidebar: 'json',
//     // sidebar: 'state-machine',
//     registry: new ShapeRegistry(computeShapes),
//     spec: [
//       { type: Testing.OrgType, count: 2 },
//       { type: Testing.ProjectType, count: 4 },
//       { type: Testing.ContactType, count: 8 },
//     ],
//     registerSchema: true,
//     ...createMachine(createTest3({ db: true })),
//     model: '@anthropic/claude-3-5-sonnet-20241022',
//     gpt: new EdgeGptExecutor(
//       new AIServiceClientImpl({
//         // endpoint: 'https://ai-service.dxos.workers.dev',
//         endpoint: 'http://localhost:8787',
//       }),
//     ),
//   },
// };

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
