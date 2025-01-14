//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import type { ComputeEdge, Model } from '@dxos/conductor';
import { type GraphEdge, type GraphModel, type GraphNode } from '@dxos/graph';
import { withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { omit } from '@dxos/util';

import { type StateMachine, type StateMachineContext } from './graph';
import { ComputeContext, useGraphMonitor } from './hooks';
import { computeShapes } from './registry';
import { type ComputeShape } from './shapes';
import { createMachine, createTest1 } from './testing';
import { Editor, type EditorController, type EditorRootProps } from '../components';
import { AttentionContainer, ShapeRegistry } from '../components';
import { SelectionModel } from '../hooks';
import { type Shape } from '../types';

type RenderProps = EditorRootProps &
  PropsWithChildren<{
    init?: boolean;
    sidebar?: 'json' | 'selected' | 'state-machine';
    machine?: StateMachine;
    computeGraph?: GraphModel<GraphNode<Model.ComputeGraphNode>, GraphEdge<ComputeEdge>>;
    model?: StateMachineContext['model'];
    gpt?: StateMachineContext['gpt'];
  }>;

const Render = ({ id = 'test', children, graph, machine, model, gpt, init, sidebar, ...props }: RenderProps) => {
  const editorRef = useRef<EditorController>(null);

  // State machine.
  useEffect(() => {
    if (!machine || !graph) {
      return;
    }

    // TODO(burdon): Combine handlers pattern.
    void machine.open();

    const sub1 = machine.update.on(() => {
      void editorRef.current?.update();
    });

    const sub2 = machine.output.on(({ nodeId, property }) => {
      const shape = graph.nodes.find((node) => (node.data as ComputeShape).node === nodeId);
      if (shape) {
        void editorRef.current?.action?.({ type: 'trigger', ids: [shape.id] });
      }
    });

    return () => {
      void machine.close();
      sub1();
      sub2();
    };
  }, [graph, machine]);

  // Monitor.
  const graphMonitor = useGraphMonitor(machine);

  // Selection.
  const selection = useMemo(() => new SelectionModel(), []);
  const [selected, setSelected] = useState<Shape | undefined>();
  useEffect(() => {
    if (!graph) {
      return;
    }

    return selection.selected.subscribe((selected) => {
      if (selection.size) {
        // Selection included nodes and edges.
        for (const id of Array.from(selected.values())) {
          const node = graph.findNode(id);
          if (node) {
            const data = omit(node.data as any, ['node']);
            setSelected(data as any);
            break;
          }
        }
      } else {
        setSelected(undefined);
      }
    });
  }, [graph, selection]);

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

      {sidebar === 'json' && (
        <AttentionContainer id='sidebar' tabIndex={0} classNames='flex grow overflow-hidden'>
          <SyntaxHighlighter language='json' classNames='text-xs'>
            {JSON.stringify(
              {
                graph: graph?.graph,
                computeGraph: machine?.graph.model,
                userState: machine?.userState,
                executedState: machine?.executedState,
              },
              null,
              2,
            )}
          </SyntaxHighlighter>
        </AttentionContainer>
      )}

      {sidebar === 'state-machine' && (
        <AttentionContainer id='sidebar' tabIndex={0} classNames='flex grow overflow-hidden'>
          <SyntaxHighlighter language='json' classNames='text-xs'>
            {JSON.stringify({ machine, selected }, null, 2)}
          </SyntaxHighlighter>
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
    sidebar: 'json',
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
