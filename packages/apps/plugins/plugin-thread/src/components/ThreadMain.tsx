//
// Copyright 2023 DXOS.org
//

import React, { FC, useState } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { Button, Input, Main, useTranslation } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { PublicKey, SpaceProxy } from '@dxos/client';
import { observer } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { Block } from './Block';

// TODO(burdon): Make observer generic.
export const ThreadMain: FC<{ data: [SpaceProxy, ThreadType] }> = observer(({ data }) => {
  const thread = data[1];

  // TODO(burdon): Resolve username (and avatar) from identityKey.
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-orange-500', 'bg-purple-500'];
  const getBlockProperties = (identityKey: PublicKey) => ({
    displayName: humanize(identityKey),
    classes: ['text-white', colors[Number('0x' + identityKey) % colors.length]].join(' '),
  });

  // TODO(burdon): Model.
  const handleAddMessage = (text: string) => {
    // TODO(burdon): Not updated. observer()?
    thread.blocks.push(
      new ThreadType.Block({
        messages: [{ text }],
      }),
    );

    return true;
  };

  // TODO(burdon): Different width form factors.
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh] overflow-hidden items-center pb-8'>
      <div
        className={mx(
          'flex flex-col w-full min-w-[300px] md:max-w-[480px] h-full overflow-hidden',
          'p-4 m-2 bg-zinc-50 dark:bg-neutral-800',
        )}
      >
        <div className='flex grow overflow-hidden'>
          {/* TODO(burdon): Scroll panel. */}
          <div className='flex flex-col-reverse overflow-auto py-4 px-4'>
            {thread.blocks
              .map((block) => (
                <div key={block.id} className='my-2'>
                  <Block block={block} getBlockProperties={getBlockProperties} />
                </div>
              ))
              .reverse()}
          </div>
        </div>
        <ThreadInput onMessage={handleAddMessage} />
      </div>
    </Main.Content>
  );
});

const ThreadInput: FC<{ onMessage: (text: string) => boolean | undefined }> = ({ onMessage }) => {
  const { t } = useTranslation('dxos.org/plugin/thread');
  const [text, setText] = useState('');

  const handleMessage = () => {
    const value = text.trim();
    if (value.length && onMessage(value) !== false) {
      setText('');
    }
  };

  const handleKeyDown = async (event: KeyboardEvent) => {
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
    <div className='flex flex-col shadow p-2 bg-white dark:bg-neutral-900'>
      <div>
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
          <Button density='fine' variant='outline' onClick={handleMessage}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};
