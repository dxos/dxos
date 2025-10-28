//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import React, { useMemo } from 'react';

import { AgentFunction } from '@dxos/assistant-toolkit';
import { Prompt } from '@dxos/blueprints';
import { Filter, Obj, Query } from '@dxos/echo';
import {
  ComputeEventLogger,
  DatabaseService,
  Function,
  FunctionInvocationService,
  InvocationTracer,
  TracingService,
  deserializeFunction,
} from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { TemplateEditor } from '@dxos/plugin-assistant';
import { useComputeRuntimeCallback } from '@dxos/plugin-automation';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';

export const PromptContainer = ({ space }: { space: Space }) => {
  const [prompt] = useQuery(space, Filter.type(Prompt.Prompt));

  const inputData = useMemo(
    () =>
      prompt && {
        prompt: space.db.ref(Obj.getDXN(prompt)),
        input: {},
      },
    [prompt],
  );

  // TODO(wittjosiah): Factor out.
  const handleRun = useComputeRuntimeCallback(
    space,
    Effect.fnUntraced(function* () {
      // Resolve the function
      const {
        objects: [serializedFunction],
      } = yield* DatabaseService.runQuery(Query.select(Filter.type(Function.Function, { key: AgentFunction.key })));
      invariant(Obj.instanceOf(Function.Function, serializedFunction));
      const functionDef = deserializeFunction(serializedFunction);

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

      if (Exit.isFailure(result)) {
        const error = Cause.prettyErrors(result.cause)[0];
        log.error(error.message, error.cause ?? error.stack);
      }

      yield* tracer.traceInvocationEnd({
        trace,
        // TODO(dmaretskyi): Might miss errors.
        exception: Exit.isFailure(result) ? Cause.prettyErrors(result.cause)[0] : undefined,
      });
    }),
    [inputData],
  );

  if (!prompt) {
    return null;
  }

  return (
    <div style={{ minHeight: '300px' }}>
      <Toolbar.Root>
        <Toolbar.IconButton iconOnly icon='ph--play--regular' label='Run' size={5} onClick={handleRun} />
      </Toolbar.Root>
      <TemplateEditor id={prompt.id} template={prompt.instructions} />
    </div>
  );
};
