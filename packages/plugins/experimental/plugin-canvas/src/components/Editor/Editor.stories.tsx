//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import ollamaClient from 'ollama';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { AIServiceClientImpl } from '@dxos/assistant';
import { type ReactiveEchoObject } from '@dxos/echo-db';
import { S, getSchemaTypename, getTypename } from '@dxos/echo-schema';
import { createGraph, type GraphModel, type GraphNode } from '@dxos/graph';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Form, TupleInput } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { createObjectFactory, Testing, type TypeSpec, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorController, type EditorRootProps } from './Editor';
import { computeShapes, type StateMachine, type StateMachineContext } from '../../compute';
import { EdgeGpt } from '../../compute/graph/gpt/edge';
import { OllamaGpt } from '../../compute/graph/gpt/ollama';
import { createMachine, createTest1, createTest2, createTest3 } from '../../compute/testing';
import { SelectionModel, useGraphMonitor } from '../../hooks';
import { doLayout } from '../../layout';
import { RectangleShape, type Shape } from '../../types';
import { AttentionContainer } from '../AttentionContainer';
import { ShapeRegistry } from '../Canvas';

const generator: ValueGenerator = faker as any;

const types = [Testing.OrgType, Testing.ProjectType, Testing.ContactType];

// TODO(burdon): Ref expando breaks the form.
const RectangleShapeWithoutRef = S.omit<any, any, ['object']>('object')(RectangleShape);

type RenderProps = EditorRootProps & {
  init?: boolean;
  sidebar?: 'json' | 'selected' | 'state-machine';
  machine?: StateMachine;
  model?: StateMachineContext['model'];
  gpt?: StateMachineContext['gpt'];
};

const Render = ({ id = 'test', graph: _graph, machine, model, gpt, init, sidebar, ...props }: RenderProps) => {
  const editorRef = useRef<EditorController>(null);
  const { space } = useClientProvider();

  // State machine.
  useEffect(() => {
    if (!machine) {
      return;
    }

    // TODO(burdon): Better abstraction for context?
    machine.setContext({ space, model, gpt });
    void machine.open();
    const off = machine.update.on((ev) => {
      const { node } = ev;
      void editorRef.current?.action?.({ type: 'trigger', ids: [node.id] });
    });

    return () => {
      void machine.close();
      off();
    };
  }, [machine]);

  // Monitor.
  const graphMonitor = useGraphMonitor(machine);

  // Layout.
  const [graph, setGraph] = useState<GraphModel<GraphNode<Shape>> | undefined>(_graph);
  useEffect(() => {
    if (!space || !init) {
      return;
    }

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
    return selection.selected.subscribe((selected) => {
      if (selection.size) {
        const [id] = selected.values();
        setSelected(graph?.getNode(id)?.data);
      } else {
        setSelected(undefined);
      }
    });
  }, [graph, selection]);

  return (
    <div className='grid grid-cols-[1fr,360px] w-full h-full'>
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
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </AttentionContainer>

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
            {JSON.stringify({ graph: graph?.graph }, null, 2)}
          </SyntaxHighlighter>
        </AttentionContainer>
      )}

      {sidebar === 'state-machine' && (
        <AttentionContainer id='sidebar' tabIndex={0} classNames='flex grow overflow-hidden'>
          <SyntaxHighlighter language='json' classNames='text-xs'>
            {JSON.stringify({ machine }, null, 2)}
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
    sidebar: 'json',
    init: true,
    spec: [
      { type: Testing.OrgType, count: 2 },
      { type: Testing.ContactType, count: 4 },
    ],
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
    sidebar: 'selected',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(createTest1()),
  },
};

export const Compute2: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'state-machine',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(createTest2()),
  },
};

export const Ollama: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    sidebar: 'state-machine',
    registry: new ShapeRegistry(computeShapes),
    ...createMachine(createTest3()),
    gpt: new OllamaGpt(ollamaClient),
  },
};

export const GPT: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'json',
    // sidebar: 'state-machine',
    registry: new ShapeRegistry(computeShapes),
    spec: [
      { type: Testing.OrgType, count: 2 },
      { type: Testing.ProjectType, count: 4 },
      { type: Testing.ContactType, count: 8 },
    ],
    registerSchema: true,
    ...createMachine(createTest3({ db: true })),
    model: '@anthropic/claude-3-5-sonnet-20241022',
    gpt: new EdgeGpt(
      new AIServiceClientImpl({
        // endpoint: 'https://ai-service.dxos.workers.dev',
        endpoint: 'http://localhost:8787',
      }),
    ),
  },
};

export const GPTArtifact: Story = {
  args: {
    // debug: true,
    showGrid: false,
    snapToGrid: false,
    // sidebar: 'json',
    // sidebar: 'state-machine',
    registry: new ShapeRegistry(computeShapes),
    spec: [
      { type: Testing.OrgType, count: 2 },
      { type: Testing.ProjectType, count: 4 },
      { type: Testing.ContactType, count: 8 },
    ],
    registerSchema: true,
    ...createMachine(createTest3({ cot: true, artifact: true, history: true, db: true, textToImage: true })),
    model: '@anthropic/claude-3-5-sonnet-20241022',
    gpt: new EdgeGpt(
      new AIServiceClientImpl({
        // endpoint: 'https://ai-service.dxos.workers.dev',
        endpoint: 'http://localhost:8787',
      }),
    ),
  },
};
