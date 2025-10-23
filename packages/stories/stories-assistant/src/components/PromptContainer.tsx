//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import React, { useMemo } from 'react';

import { agent } from '@dxos/assistant-testing';
import { Prompt } from '@dxos/blueprints';
import { Filter, Obj, Query } from '@dxos/echo';
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
import { type Space, createDocAccessor, useQuery } from '@dxos/react-client/echo';
import { type ThemedClassName, Toolbar, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

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
      } = yield* DatabaseService.runQuery(Query.select(Filter.type(FunctionType, { key: agent.key })));
      invariant(Obj.instanceOf(FunctionType, serializedFunction));
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
      <PromptEditor prompt={prompt} />
    </div>
  );
};

// TODO(wittjosiah): Replace this w/ a Surface that defers to AssistantPlugin's prompt editor.
const PromptEditor = ({ prompt, classNames }: ThemedClassName<{ prompt: Prompt.Prompt }>) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      initialValue: prompt.instructions ?? '',
      extensions: [
        createDataExtensions({ id: prompt.id, text: createDocAccessor(prompt, ['instructions']) }),
        createBasicExtensions({
          bracketMatching: false,
          lineNumbers: true,
          lineWrapping: true,
        }),
        createThemeExtensions({ themeMode }),
        createMarkdownExtensions(),
      ].filter(Predicate.isTruthy),
    };
  }, [themeMode, prompt]);

  return <div ref={parentRef} className={mx('bs-full overflow-hidden', classNames)} />;
};
