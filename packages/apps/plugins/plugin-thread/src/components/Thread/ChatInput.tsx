//
// Copyright 2023 DXOS.org
//

import { PaperPlaneRight } from '@phosphor-icons/react';
import React, { forwardRef, type KeyboardEventHandler, useState } from 'react';

import { TextObject } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { TextEditor, useTextModel } from '@dxos/react-ui-editor';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

import { tagExtension } from './extension';

export type ChatInputProps = {
  className?: string;
  placeholder?: string;
  onMessage: (text: string) => boolean | void;
};

export const ChatInput = forwardRef<HTMLDivElement, ChatInputProps>(
  ({ className = mx(inputSurface, 'rounded shadow p-2'), placeholder, onMessage }, ref) => {
    const [text] = useState(new TextObject());
    const model = useTextModel({ text });

    const handleMessage = () => {
      const value = text.content!.toString();
      if (value.length && onMessage(value) !== false) {
        text.content?.delete(0, text.content.length);
      }
    };

    const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
      switch (event.key) {
        case 'Escape': {
          text.content?.delete(0, text.content.length);
          break;
        }
        case 'Enter': {
          event.preventDefault();
          handleMessage();
          break;
        }
      }
    };

    if (!model) {
      return null;
    }

    return (
      <div ref={ref} className={mx('flex w-full overflow-hidden', className)} onKeyDownCapture={handleKeyDown}>
        <TextEditor
          model={model}
          extensions={[tagExtension]}
          slots={{
            root: {
              className: 'flex w-full items-center pl-2 overflow-x-hidden',
            },
            editor: {
              placeholder,
            },
          }}
        />

        <div role='none' className='flex shrink-0 pr-1'>
          <Button variant='ghost' classNames='p-1' onClick={() => handleMessage()}>
            <PaperPlaneRight className={getSize(5)} />
          </Button>
        </div>
      </div>
    );
  },
);
