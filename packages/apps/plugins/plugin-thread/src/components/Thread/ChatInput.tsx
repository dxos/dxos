//
// Copyright 2023 DXOS.org
//

import { syntaxHighlighting } from '@codemirror/language';
import { PaperPlaneRight } from '@phosphor-icons/react';
import React, { type KeyboardEventHandler, useState } from 'react';

import { TextObject } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { TextEditor, useTextModel } from '@dxos/react-ui-editor';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

import { promptHighlightStyles, promptLanguage } from './syntax';
import { THREAD_PLUGIN } from '../../meta';

export type ChatInputProps = {
  className?: string;
  onMessage: (text: string) => boolean | void;
};

export const ChatInput = ({ className = mx(inputSurface, 'rounded shadow p-2'), onMessage }: ChatInputProps) => {
  const { t } = useTranslation(THREAD_PLUGIN);
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
    <div className={mx('flex w-full', className)} onKeyDownCapture={handleKeyDown}>
      <TextEditor
        model={model}
        extensions={[promptLanguage, syntaxHighlighting(promptHighlightStyles)]}
        slots={{
          root: {
            className: 'flex w-full items-center pl-2 overflow-x-hidden',
          },
          editor: {
            placeholder: t('text placeholder'),
          },
        }}
      />
      <div className='flex w-[40px] flex-col-reverse shrink-0'>
        <Button density='fine' variant='ghost' onClick={() => handleMessage()}>
          <PaperPlaneRight className={getSize(5)} />
        </Button>
      </div>
    </div>
  );
};
