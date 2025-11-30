//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import React, { useCallback, useMemo, useState } from 'react';

import { Agent } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { type FunctionDefinition, FunctionInvocationService } from '@dxos/functions';
import { InvocationTracer } from '@dxos/functions-runtime';
import { TracingServiceExt } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useComputeRuntimeCallback } from '@dxos/plugin-automation';
import { Graph } from '@dxos/plugin-explorer/types';
import { getSpace } from '@dxos/react-client/echo';
import { DropdownMenu, IconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { Text, View } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';
import { ComputeGraph } from '../notebook';
import { type Notebook } from '../types';

import { NotebookMenu, NotebookStack, type NotebookStackProps } from './NotebookStack';
import { type TypescriptEditorProps } from './TypescriptEditor';

const INCLUDE_BLUEPRINTS = ['dxos.org/blueprint/assistant', 'dxos.org/blueprint/markdown'];

// TODO(burdon): Support calling named deployed functions (as with sheet).

export type NotebookContainerProps = {
  role?: string;
  notebook?: Notebook.Notebook;
} & Pick<TypescriptEditorProps, 'env'>;

export const NotebookContainer = ({ notebook, env }: NotebookContainerProps) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(notebook);
  const attendableId = notebook ? Obj.getDXN(notebook).toString() : '';
  const { hasAttention } = useAttention(attendableId);

  // TODO(burdon): Consolidate execution and state (with graph).
  //  Generalize ComputeGraph evaluation function (using effects).
  const graph = useMemo(() => notebook && new ComputeGraph(notebook), [notebook]);

  const [queryValues, setQueryValues] = useState<Record<string, any>>({});
  const handleExecQueries = useCallback(async () => {
    invariant(space);

    const builder = new QueryBuilder();
    for (const cell of notebook?.cells ?? []) {
      if (cell.type === 'query') {
        if (cell.source?.target) {
          const source = cell.source.target.content;
          const { name, filter } = builder.build(source);
          if (filter) {
            const ast = Query.select(filter).ast;
            const graph = cell.graph?.target;
            if (!graph) {
              const { view } = await View.makeFromSpace({ space });
              const graph = Graph.make({ query: { ast }, view });
              cell.graph = Ref.make(graph);
              cell.name = name;
            } else {
              graph.query.ast = ast;
            }
          }
        }

        if (cell.name && cell.graph?.target) {
          const graph = Obj.getSnapshot(cell.graph?.target);
          const query = Query.fromAst(graph.query.ast);
          const objects = await space?.db.query(query).run();
          const objectIds = objects?.map((obj) => obj.id);
          setQueryValues((prev) => ({ ...prev, [cell.name!]: objectIds }));
        }
      }
    }
  }, [space, notebook, graph]);

  const [promptResults, setPromptResults] = useState<Record<string, string>>({});
  const handleExecPrompts = useComputeRuntimeCallback(
    space,
    Effect.fnUntraced(function* () {
      invariant(graph);

      const prompts =
        notebook?.cells
          .filter((cell) => cell.type === 'prompt')
          .map((cell) => cell.prompt)
          .filter(isNonNullable) ?? [];

      for (const prompt of prompts) {
        yield* runPrompt({
          prompt,
          input: { ...queryValues, ...graph.valuesByName.value },
          onResult: (result) =>
            setPromptResults((prev) => ({
              ...prev,
              [prompt.dxn.toString()]: result,
            })),
        });
      }
    }),
    [notebook, graph, queryValues],
  );

  // TODO(burdon): Cache values in context (preserve when switched).
  const handleCompute = useCallback(async () => {
    // TODO(burdon): Generalize executors (dependencies).
    await graph?.evaluate();
    await handleExecQueries();
    await handleExecPrompts();
  }, [graph, handleExecQueries, handleExecPrompts]);

  const handleRearrange = useCallback<NonNullable<NotebookStackProps['onRearrange']>>(
    (source, target) => {
      invariant(notebook);
      const from = notebook.cells.findIndex((cell) => cell.id === source.id);
      const to = notebook.cells.findIndex((cell) => cell.id === target.id);
      if (from != null && to != null) {
        const cell = notebook.cells.splice(from, 1)[0];
        if (cell) {
          notebook.cells.splice(to, 0, cell);
        }
      }
    },
    [notebook],
  );

  const handleCellInsert = useCallback<NonNullable<NotebookStackProps['onCellInsert']>>(
    async (type, after) => {
      invariant(notebook);
      const cell: Notebook.Cell = { id: crypto.randomUUID(), type };
      switch (type) {
        case 'markdown':
        case 'script':
        case 'query': {
          cell.source = Ref.make(Text.make());
          break;
        }

        case 'prompt': {
          if (space) {
            const objects = await space.db.query(Query.select(Filter.type(Blueprint.Blueprint))).run();
            const blueprints = objects
              .filter((blueprint) => INCLUDE_BLUEPRINTS.includes(blueprint.key))
              .map((blueprint) => Ref.make(blueprint));
            cell.prompt = Ref.make(Prompt.make({ instructions: '', blueprints }));
          }
          break;
        }
      }

      const idx = after ? notebook.cells.findIndex((cell) => cell.id === after) : notebook.cells.length;
      notebook.cells.splice(idx, 0, cell);
    },
    [space, notebook],
  );

  const handleCellDelete = useCallback<NonNullable<NotebookStackProps['onCellDelete']>>(
    (id) => {
      invariant(notebook);
      const idx = notebook.cells.findIndex((cell) => cell.id === id);
      if (idx !== -1) {
        notebook.cells.splice(idx, 1);
      }
    },
    [notebook],
  );

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root disabled={!hasAttention} textBlockWidth>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton icon='ph--plus--regular' iconOnly label={t('notebook cell insert label')} />
          </DropdownMenu.Trigger>
          <NotebookMenu onCellInsert={handleCellInsert} />
        </DropdownMenu.Root>
        <Toolbar.IconButton
          icon='ph--play--fill'
          iconOnly
          label={t('compute label')}
          classNames='text-green-500'
          onClick={handleCompute}
        />
      </Toolbar.Root>
      <div role='none' className='flex bs-full overflow-hidden -mis-[1px] -mie-[1px]'>
        <NotebookStack
          classNames='container-max-width border-l border-r border-subduedSeparator'
          space={space}
          notebook={notebook}
          graph={graph}
          env={env}
          promptResults={promptResults}
          onRearrange={handleRearrange}
          onCellInsert={handleCellInsert}
          onCellDelete={handleCellDelete}
        />
      </div>
    </StackItem.Content>
  );
};

export default NotebookContainer;

// TODO(wittjosiah): Factor out. Copied from PromptArticle in plugin-assistant.
const runPrompt = Effect.fn(function* ({
  prompt,
  input,
  onResult,
}: {
  prompt: Ref.Ref<Prompt.Prompt>;
  input: Record<string, any>;
  onResult: (result: string) => void;
}) {
  const inputData: FunctionDefinition.Input<typeof Agent.prompt> = {
    prompt,
    input,
  };
  const tracer = yield* InvocationTracer;
  const trace = yield* tracer.traceInvocationStart({
    target: undefined,
    payload: {
      data: {},
    },
  });

  // Invoke the function.
  const result = yield* FunctionInvocationService.invokeFunction(Agent.prompt, inputData).pipe(
    Effect.provide(TracingServiceExt.layerQueue(trace.invocationTraceQueue)),
    Effect.exit,
  );

  Exit.match(result, {
    onFailure: (cause) => {
      const error = Cause.prettyErrors(cause)[0];
      log.error(error.message, error.cause ?? error.stack);
      onResult(error.message);
    },
    onSuccess: (result: any) => {
      onResult(result.note);
    },
  });

  yield* tracer.traceInvocationEnd({
    trace,
    // TODO(dmaretskyi): Might miss errors.
    exception: Exit.isFailure(result) ? Cause.prettyErrors(result.cause)[0] : undefined,
  });
});
