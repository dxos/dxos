//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import React, { useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Agent } from '@dxos/assistant-toolkit';
import { type Prompt } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { ComputeEventLogger, FunctionInvocationService, InvocationTracer, TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { useComputeRuntimeCallback } from '@dxos/plugin-automation';
import { getSpace } from '@dxos/react-client/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';

import { meta } from '../meta';

import { TemplateEditor } from './TemplateEditor';

export type PromptArticleProps = SurfaceComponentProps<Prompt.Prompt>;

export const PromptArticle = ({ object }: PromptArticleProps) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(object);
  const { hasAttention } = useAttention(Obj.getDXN(object).toString());

  const inputData = useMemo(
    () =>
      object && {
        prompt: space?.db.ref(Obj.getDXN(object)),
        input: {},
      },
    [object, space],
  );

  // TODO(wittjosiah): Factor out.
  const handleRun = useComputeRuntimeCallback(
    space,
    Effect.fnUntraced(function* () {
      const tracer = yield* InvocationTracer;
      const trace = yield* tracer.traceInvocationStart({
        target: undefined,
        payload: {
          data: {},
        },
      });

      // Invoke the function.
      const result = yield* FunctionInvocationService.invokeFunction(Agent.prompt, inputData).pipe(
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

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root disabled={!hasAttention} onClick={handleRun}>
        <Toolbar.IconButton iconOnly icon='ph--play--regular' label={t('run prompt label')} onClick={handleRun} />
      </Toolbar.Root>
      <TemplateEditor id={object.id} template={object.instructions} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default PromptArticle;
