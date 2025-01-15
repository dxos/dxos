//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, FunctionBody, getHeight } from './Function';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { GptInput, GptOutput } from '@dxos/conductor';
import { useComputeNodeState } from '../hooks';
import React, { useEffect, useState } from 'react';
import type { ResultStreamEvent } from '@dxos/assistant';

export const GptShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('gpt'),
  }),
);

export type GptShape = S.Schema.Type<typeof GptShape>;

export type CreateGptProps = CreateShapeProps<GptShape>;

export const createGpt = ({ id, ...rest }: CreateGptProps): GptShape => {
  return {
    id,
    type: 'gpt',
    size: { width: 256, height: Math.max(getHeight(GptInput), getHeight(GptOutput)) },
    ...rest,
  };
};

export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {
  const { meta, runtime } = useComputeNodeState(shape);
  const [tokens, setTokens] = useState<string>('');

  useEffect(() => {
    return runtime.subscribeToEventLog((ev) => {
      switch (ev.type) {
        case 'begin-compute':
          setTokens('');
          break;
        case 'custom':
          const token: ResultStreamEvent = ev.event;

          // TODO(dmaretskyi): Handle other types of events.
          switch (token.type) {
            case 'content_block_delta':
              switch (token.delta.type) {
                case 'text_delta':
                  const delta = token.delta.text;
                  setTokens((prev) => prev + delta);
                  break;
              }
              break;
          }
          break;
      }
    });
  }, [runtime?.subscribeToEventLog]);

  // TODO(burdon): Fix layout.
  return (
    <div className='flex flex-col gap-2'>
      <FunctionBody name={'GPT'} inputSchema={meta.input} outputSchema={meta.output} />
      <div>{tokens}</div>
    </div>
  );
};

export const gptShape: ShapeDef<GptShape> = {
  type: 'gpt',
  icon: 'ph--brain--regular',
  component: GptComponent,
  createShape: createGpt,
  // TODO(dmaretskyi): Can we fetch the schema dynamically?
  getAnchors: (shape) => createFunctionAnchors(shape, GptInput, GptOutput),
};
