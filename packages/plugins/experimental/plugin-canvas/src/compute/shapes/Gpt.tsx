//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import type { ResultStreamEvent } from '@dxos/assistant';
import { GptInput, GptOutput } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, FunctionBody, getHeight } from './common';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { useComputeNodeState } from '../hooks';

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
  const [text, setText] = useState('');
  const [tokens, setTokens] = useState(0);

  useEffect(() => {
    return runtime.subscribeToEventLog((ev) => {
      switch (ev.type) {
        case 'begin-compute': {
          setText('');
          break;
        }
        case 'custom': {
          const token: ResultStreamEvent = ev.event;
          switch (token.type) {
            case 'content_block_delta':
              switch (token.delta.type) {
                case 'text_delta': {
                  const delta = token.delta.text;
                  setText((prev) => {
                    const text = prev + delta;
                    // TODO(burdon): Get token count.
                    setTokens(text.split(' ').length);
                    return text;
                  });
                  break;
                }
              }
              break;

            // TODO(dmaretskyi): Handle other types of events.
          }
          break;
        }
      }
    });
  }, [runtime?.subscribeToEventLog]);

  return (
    <FunctionBody
      shape={shape}
      content={<div className='px-2 py-1 overflow-y-scroll'>{text}</div>}
      status={`${tokens} tokens`}
      inputSchema={meta.input}
      outputSchema={meta.output}
    />
  );
};

export const gptShape: ShapeDef<GptShape> = {
  type: 'gpt',
  name: 'GPT',
  icon: 'ph--brain--regular',
  component: GptComponent,
  createShape: createGpt,
  getAnchors: (shape) => createFunctionAnchors(shape, GptInput, GptOutput),
  openable: true,
};