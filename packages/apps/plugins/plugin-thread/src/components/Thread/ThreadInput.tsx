//
// Copyright 2023 DXOS.org
//

import { PaperPlaneRight } from '@phosphor-icons/react';
import React, { type FC, type KeyboardEvent, useState } from 'react';

import { Button, Input, useTranslation } from '@dxos/react-ui';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

import { THREAD_PLUGIN } from '../../types';

export const ThreadInput: FC<{ onMessage: (text: string) => boolean | undefined }> = ({ onMessage }) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  const [text, setText] = useState('');

  const handleMessage = () => {
    const value = text.trim();
    if (value.length && onMessage(value) !== false) {
      setText('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    switch (event.key) {
      case 'Escape': {
        setText('');
        break;
      }
      case 'Enter': {
        event.preventDefault();
        handleMessage();
        break;
      }
    }
  };

  return (
    <div className={mx('flex w-full p-2 shadow rounded', inputSurface)}>
      <Input.Root>
        <Input.Label srOnly>{t('block input label')}</Input.Label>
        <Input.TextArea
          autoFocus
          autoComplete='off'
          rows={3}
          variant='subdued'
          classNames='resize-none border-none outline-none ml-[26px]'
          placeholder='Enter message.'
          value={text}
          onChange={({ target: { value } }) => setText(value)}
          onKeyDown={handleKeyDown}
        />
      </Input.Root>
      <div className='flex w-[40px] flex-col-reverse shrink-0'>
        <Button density='fine' variant='ghost' onClick={handleMessage}>
          <PaperPlaneRight className={getSize(5)} />
        </Button>
      </div>
    </div>
  );
};
