//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import React, { useCallback, useMemo, useState } from 'react';

import { agent } from '@dxos/assistant-testing';
import { Prompt } from '@dxos/blueprints';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import {
  ComputeEventLogger,
  DatabaseService,
  FunctionInvocationService,
  FunctionType,
  InvocationTracer,
  TracingService,
  deserializeFunction,
} from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useComputeRuntimeCallback } from '@dxos/plugin-automation';
import { getSpace } from '@dxos/react-client/echo';
import { DropdownMenu, IconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';
import { ComputeGraph } from '../notebook';
import { type Notebook } from '../types';

import { NotebookMenu, NotebookStack, type NotebookStackProps } from './NotebookStack';
import { type TypescriptEditorProps } from './TypescriptEditor';

// TODO(burdon): Support calling named deployed functions (as with sheet).

export type NotebookContainerProps = {
  role?: string;
  notebook?: Notebook.Notebook;
} & Pick<TypescriptEditorProps, 'env'>;

export const NotebookContainer = ({ notebook, env }: NotebookContainerProps) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(notebook);
  const graph = useMemo(() => notebook && new ComputeGraph(notebook), [notebook]);
  const [promptResults, setPromptResults] = useState<Record<string, string>>({});

  // TODO(wittjosiah): Factor out. Copied from PromptContainer in stories-assistant.
  const handleRun = useComputeRuntimeCallback(
    space,
    Effect.fnUntraced(function* () {
      // Resolve the function.
      const {
        objects: [serializedFunction],
      } = yield* DatabaseService.runQuery(Query.select(Filter.type(FunctionType, { key: agent.key })));
      invariant(Obj.instanceOf(FunctionType, serializedFunction));
      const functionDef = deserializeFunction(serializedFunction);

      const prompts =
        notebook?.cells
          .filter((cell) => cell.type === 'prompt')
          .map((cell) => cell.prompt)
          .filter(isNonNullable) ?? [];

      for (const prompt of prompts) {
        const inputData = {
          prompt,
          input: graph?.valuesByName.value,
        };

        const tracer = yield* InvocationTracer;
        const trace = yield* tracer.traceInvocationStart({
          target: Obj.getDXN(serializedFunction),
          payload: {
            data: {},
          },
        });

        // Invoke the function.
        const result = yield* FunctionInvocationService.invokeFunction(functionDef, inputData).pipe(
          Effect.provide(
            ComputeEventLogger.layerFromTracing.pipe(
              Layer.provideMerge(TracingService.layerQueue(trace.invocationTraceQueue)),
            ),
          ),
          Effect.exit,
        );

        Exit.match(result, {
          onFailure: (cause) => {
            const error = Cause.prettyErrors(cause)[0];
            log.error(error.message, error.cause ?? error.stack);
            setPromptResults((prev) => ({ ...prev, [prompt.dxn.toString()]: error.message }));
          },
          onSuccess: (result: any) => {
            setPromptResults((prev) => ({ ...prev, [prompt.dxn.toString()]: result.note }));
          },
        });

        yield* tracer.traceInvocationEnd({
          trace,
          // TODO(dmaretskyi): Might miss errors.
          exception: Exit.isFailure(result) ? Cause.prettyErrors(result.cause)[0] : undefined,
        });
      }
    }),
    [notebook, graph],
  );

  // TODO(burdon): Cache values in context (preserve when switched).
  const handleCompute = useCallback(async () => {
    graph?.evaluate();
    await handleRun();
  }, [graph, handleRun]);

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
    (type, after) => {
      invariant(notebook);
      const cell: Notebook.Cell = { id: crypto.randomUUID(), type };
      switch (type) {
        case 'markdown':
        case 'script':
        case 'query': {
          cell.script = Ref.make(DataType.makeText());
          break;
        }

        case 'prompt': {
          if (space) {
            cell.prompt = Ref.make(Prompt.make({ instructions: '' }));
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
      <Toolbar.Root textBlockWidth>
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
