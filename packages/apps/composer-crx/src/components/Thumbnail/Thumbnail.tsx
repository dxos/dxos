//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Field, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// TODO(burdon): Generalize to card.
export const Thumbnail = ({ url, classNames }: ThemedClassName<{ url: string }>) => {
  return (
    <div className={mx('flex flex-col w-full', classNames)}>
      <Toolbar.Root>
        <Field.Root>
          <Field.Input disabled value={url} />
        </Field.Root>
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

      <div className='flex justify-center p-2'>
        <img src={url} alt='Thumbnail' />
      </div>
    </div>
  );
};
