//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Input from '@dxos/react-ui/Input';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

// TODO(burdon): Generalize to card.
export const Thumbnail = ({ url, classNames }: Util.ThemedClassName<{ url: string }>) => {
  return (
    <div className={mx('flex flex-col w-full', classNames)}>
      <Toolbar.Root>
        <Field.Root>
          <Input.Input disabled value={url} />
        </Field.Root>
        <Button.Button
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
