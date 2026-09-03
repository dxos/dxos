//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ScrollArea } from '@dxos/react-ui';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks/index.ts';
import { FunctionBody } from './common/index.ts';
import { type GptShape } from './gpt-def.ts';

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
          // TODO(burdon): Any?
          const token = ev.event;
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
      content={
        <ScrollArea.Root orientation='vertical' thin>
          <ScrollArea.Viewport>{text}</ScrollArea.Viewport>
        </ScrollArea.Root>
      }
      status={`${tokens} tokens`}
      inputSchema={meta.input}
      outputSchema={meta.output}
    />
  );
};
