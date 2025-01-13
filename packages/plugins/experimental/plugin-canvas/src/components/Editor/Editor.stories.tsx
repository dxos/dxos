//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import type { ComputeEdge, Model } from '@dxos/conductor';
import { type ReactiveEchoObject } from '@dxos/echo-db';
import { S, getSchemaTypename, getTypename } from '@dxos/echo-schema';
import { createGraph, type GraphEdge, type GraphModel, type GraphNode } from '@dxos/graph';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Form, TupleInput } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { createObjectFactory, Testing, type TypeSpec, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { omit } from '@dxos/util';

import { Editor, type EditorController, type EditorRootProps } from './Editor';
import {
  computeShapes,
  type ComputeShape,
  type StateMachine,
  type StateMachineContext,
  useGraphMonitor,
} from '../../compute';
import { ComputeContext } from '../../compute';
import { createMachine, createTest1 } from '../../compute/testing';
import { SelectionModel } from '../../hooks';
import { doLayout } from '../../layout';
import { RectangleShape, type Shape } from '../../types';
import { AttentionContainer } from '../AttentionContainer';
import { ShapeRegistry } from '../Canvas';
import { DragTest } from '../Canvas/DragTest';

const generator: ValueGenerator = faker as any;

const types = [Testing.OrgType, Testing.ProjectType, Testing.ContactType];

// TODO(burdon): Ref expando breaks the form.
const RectangleShapeWithoutRef = S.omit<any, any, ['object']>('object')(RectangleShape);

type RenderProps = EditorRootProps &
  PropsWithChildren<{
    init?: boolean;
    sidebar?: 'json' | 'selected' | 'state-machine';
    machine?: StateMachine;
    computeGraph?: GraphModel<GraphNode<Model.ComputeGraphNode>, GraphEdge<ComputeEdge>>;
    model?: StateMachineContext['model'];
    gpt?: StateMachineContext['gpt'];
  }>;

const Render = ({
  id = 'test',
  children,
  graph: _graph,
  machine,
  model,
  gpt,
  init,
  sidebar,
  ...props
}: RenderProps) => {
  const editorRef = useRef<EditorController>(null);
  const { space } = useClientProvider();
  const [graph, setGraph] = useState<GraphModel<GraphNode<Shape>> | undefined>(_graph);

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

  // Layout.
  useEffect(() => {
    if (!space || !init) {
      return;
    }

    // Load objects.
    const t = setTimeout(async () => {
      const { objects } = await space.db
        .query((object: ReactiveEchoObject<any>) => types.some((type) => type.typename === getTypename(object)))
        .run();

      const model = await doLayout(createGraph(objects));
      setGraph(model);
    });

    return () => clearTimeout(t);
  }, [space, init]);

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

      {/* TODO(burdon): Need to set schema based on what is selected. */}
      {sidebar === 'selected' && selected && (
        <Form
          schema={RectangleShapeWithoutRef}
          values={selected}
          Custom={{
            // TODO(burdon): Replace by type.
            ['center' as const]: (props) => <TupleInput {...props} binding={['x', 'y']} />,
            ['size' as const]: (props) => <TupleInput {...props} binding={['width', 'height']} />,
          }}
        />
      )}

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
  title: 'plugins/plugin-canvas/Editor',
  component: Editor.Root,
  render: Render,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }, { args: { spec, registerSchema } }) => {
        if (spec) {
          if (registerSchema) {
            // Replace all schema in the spec with the registered schema.
            const registeredSchema = await space.db.schemaRegistry.register([
              ...new Set(spec.map((schema: any) => schema.type)),
            ] as S.Schema.AnyNoContext[]);

            spec = spec.map((schema: any) => ({
              ...schema,
              type: registeredSchema.find((s) => getSchemaTypename(s) === getSchemaTypename(schema.type)),
            }));
          } else {
            space.db.graph.schemaRegistry.addSchema(types);
          }

          const createObjects = createObjectFactory(space.db, generator);
          await createObjects(spec as TypeSpec[]);
          await space.db.flush({ indexes: true });
        }
      },
    }),
    withTheme,
    withAttention,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export default meta;

type Story = StoryObj<RenderProps & { spec?: TypeSpec[]; registerSchema?: boolean }>;

export const Default: Story = {
  args: {
    // sidebar: 'json',
    init: true,
    // showGrid: false,
    snapToGrid: false,
    spec: [{ type: Testing.OrgType, count: 1 }],
  },
};

export const DraggingTest: Story = {
  args: {
    // sidebar: 'json',
    // showGrid: false,
    snapToGrid: false,
    children: <DragTest />,
  },
};

export const Query: Story = {
  args: {
    sidebar: 'selected',
    init: true,
    spec: [
      { type: Testing.OrgType, count: 4 },
      { type: Testing.ProjectType, count: 0 },
      { type: Testing.ContactType, count: 16 },
    ],
  },
};

export const Compute: Story = {
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
