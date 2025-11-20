//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Input, Toolbar } from '@dxos/react-ui';

// TODO(burdon): Generalize to card.
export const Thumbnail = ({ url }: { url: string }) => {
  return (
    <div className='flex flex-col is-full'>
      <Toolbar.Root>
        <Input.Root>
          <Input.TextInput disabled value={url} />
        </Input.Root>
        <Toolbar.IconButton
          icon='ph--clipboard--regular'
          iconOnly
          label='Clipboard'
          onClick={async () => {
            if (url) {
              await navigator.clipboard.writeText(url);
            }
          }}
        />
      </Toolbar.Root>

      <div className='flex justify-center'>
        <img src={url} alt='Thumbnail' />
      </div>
    </div>
  );
};
