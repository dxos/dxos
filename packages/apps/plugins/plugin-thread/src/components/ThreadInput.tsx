//
// Copyright 2023 DXOS.org
//

import { PaperPlaneRight } from '@phosphor-icons/react';
import React, { FC, KeyboardEvent, useState } from 'react';

import { Button, Input, useTranslation } from '@dxos/aurora';
import { getSize, groupSurface, mx } from '@dxos/aurora-theme';

import { THREAD_PLUGIN } from '../props';

export const ThreadInput: FC<{ onMessage: (text: string) => boolean | undefined }> = ({ onMessage }) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  const [text, setText] = useState('');

  const handleMessage = () => {
    const value = text.trim();
    if (value.length && onMessage(value) !== false) {
      setText('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Escape': {
        setText('');
        break;
      }
      case 'Enter': {
        handleMessage();
        break;
      }
    }
  };

  return (
    <div className={mx('flex flex-col w-full shadow p-2', groupSurface)}>
      <div>
        {/* TODO(burdon): Multi-line textarea. Or document. */}
        <Input.Root>
          <Input.Label srOnly>{t('block input label')}</Input.Label>
          <Input.TextInput
            autoFocus
            autoComplete='off'
            variant='subdued'
            classNames='flex-1 is-auto pis-2'
            placeholder='Enter message.'
            value={text}
            onChange={({ target: { value } }) => setText(value)}
            onKeyDown={handleKeyDown}
          />
        </Input.Root>
      </div>
      <div className='flex flex-row-reverse'>
        <div>
          <Button density='fine' variant='ghost' onClick={handleMessage}>
            <PaperPlaneRight className={getSize(5)} />
          </Button>
        </div>
      </div>
    </div>
  );
};
