//
// Copyright 2023 DXOS.org
//

import { type EditorView, keymap } from '@codemirror/view';
import { PaperPlaneRight, Spinner } from '@phosphor-icons/react';
import React, { useRef, useState } from 'react';

import { setTextContent, TextObject } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { listener, TextEditor, useTextModel } from '@dxos/react-ui-editor';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

import { tagExtension } from './extension';

export type ChatInputProps = {
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
  processing?: boolean;
  onFocus?: () => void;
  onMessage: (text: string) => boolean | void;
};

export const ChatInput = ({
  className = 'rounded shadow p-2',
  autoFocus,
  placeholder,
  processing,
  onFocus,
  onMessage,
}: ChatInputProps) => {
  const [focus, setFocus] = useState(autoFocus);
  const [text, setText] = useState(new TextObject());
  const model = useTextModel({ text });
  const ref = useRef<EditorView>(null);

  const handleMessage = () => {
    const value = text.content!.toString();
    if (value.length && onMessage(value) !== false) {
      setText(new TextObject());
      setFocus(true);
    }
  };

  if (!model) {
    return null;
  }

  return (
    <div className={mx('flex w-full', inputSurface, className)}>
      <TextEditor
        ref={ref}
        model={model}
        autofocus={focus}
        placeholder={placeholder}
        extensions={[
          tagExtension,
          keymap.of([
            {
              key: 'Enter',
              run: () => {
                handleMessage();
                return true;
              },
            },
            {
              key: 'Escape',
              run: () => {
                setTextContent(text, '');
                return true;
              },
            },
          ]),
          listener({
            onFocus: (focused) => {
              if (focused) {
                onFocus?.();
              }
            },
          }),
        ]}
        slots={{
          root: {
            className: 'w-full items-center',
          },
        }}
      />

      <div role='none' className='flex shrink-0 pr-1'>
        <Button variant='ghost' classNames='p-1' onClick={() => handleMessage()} disabled={processing}>
          {(processing && <Spinner weight='bold' className={mx(getSize(6), 'text-blue-500 animate-spin')} />) || (
            <PaperPlaneRight className={mx(getSize(5))} />
          )}
        </Button>
      </div>
    </div>
  );
};
